// FidelityFX Contrast Adaptive Sharpening (CAS) by AMD
// Ported to mpv by agyild
// Optimized for LUMA plane with minimal GPU overhead (<0.8ms)

//!HOOK LUMA
//!BIND HOOKED
//!DESC FidelityFX Sharpening (Relinearization)
//!WHEN OUTPUT.w OUTPUT.h * LUMA.w LUMA.h * / 1.0 > ! OUTPUT.w OUTPUT.h * LUMA.w LUMA.h * / 1.0 < ! *

#define SOURCE_TRC 4
#define CUSTOM_GAMMA 2.2

float From709(float rec709) {
	return max(min(rec709 / float(4.5), float(0.081)), pow((rec709 + float(0.099)) / float(1.099), float(1.0 / 0.45)));
}

float FromPq(float pq) {
	float p = pow(pq, float(0.0126833));
	return (pow(clamp(p - float(0.835938), 0.0, 1.0) / (float(18.8516) - float(18.6875) * p), float(6.27739)));
}

float FromSrgb(float srgb) {
	return max(min(srgb / 12.92, float(0.04045)), pow((srgb + float(0.055)) / float(1.055), float(2.4)));
}

float FromHlg(float hlg) {
	const float a = 0.17883277;
	const float b = 0.28466892;
	const float c = 0.55991073;
	float linear;
	if (hlg >= 0.0 && hlg <= 0.5) {
		linear = pow(hlg, 2.0) / 3.0;
	} else {
		linear = (exp((hlg - c) / a) + b) / 12.0;
	}
	return linear;
}

vec4 hook() {
	vec4 col = HOOKED_tex(HOOKED_pos);
	col.r = clamp(col.r, 0.0, 1.0);
#if (SOURCE_TRC == 1)
	col.r = From709(col.r);
#elif (SOURCE_TRC == 2)
	col.r = FromPq(col.r);
#elif (SOURCE_TRC == 3)
	col.r = FromSrgb(col.r);
#elif (SOURCE_TRC == 4)
	col.r = pow(col.r, float(2.4));
#elif (SOURCE_TRC == 5)
	col.r = FromHlg(col.r);
#elif (SOURCE_TRC == 6)
	col.r = pow(col.r, float(CUSTOM_GAMMA));
#endif
	return col;
}

//!HOOK LUMA
//!BIND HOOKED
//!DESC FidelityFX Sharpening
//!WHEN OUTPUT.w OUTPUT.h * LUMA.w LUMA.h * / 1.0 > ! OUTPUT.w OUTPUT.h * LUMA.w LUMA.h * / 1.0 < ! *

#define SHARPENING 0.0
#define CAS_BETTER_DIAGONALS 1
#define CAS_GO_SLOWER 0
#define TARGET_TRC 4
#define CUSTOM_GAMMA 2.2

float To709(float linear) {
	return max(min(linear * float(4.5), float(0.018)), float(1.099) * pow(linear, float(0.45)) - float(0.099));
}

float ToPq(float linear) {
	float p = pow(linear, float(0.159302));
	return pow((float(0.835938) + float(18.8516) * p) / (float(1.0) + float(18.6875) * p), float(78.8438));
}

float ToSrgb(float linear) {
	return max(min(linear * float(12.92), float(0.0031308)), float(1.055) * pow(linear, float(0.41666)) - float(0.055));
}

float ToHlg(float linear) {
	const float a = 0.17883277;
	const float b = 0.28466892;
	const float c = 0.55991073;
	float hlg;
	if (linear <= 1.0 / 12.0) {
		hlg = sqrt(3.0 * linear);
	} else {
		hlg = a * log(12.0 * linear - b) + c;
	}
	return hlg;
}

#if (CAS_GO_SLOWER == 0)
float APrxLoSqrtF1(float a) {
	return uintBitsToFloat((floatBitsToUint(a) >> uint(1)) + uint(0x1fbc4639));
}

float APrxLoRcpF1(float a) {
	return uintBitsToFloat(uint(0x7ef07ebb) - floatBitsToUint(a));
}

float APrxMedRcpF1(float a) {
	float b = uintBitsToFloat(uint(0x7ef19fff) - floatBitsToUint(a));
	return b * (-b * a + float(2.0));
}
#endif

vec4 hook()
{
#if (defined(HOOKED_gather) && (__VERSION__ >= 400 || (GL_ES && __VERSION__ >= 310)))
	vec4 efhi = HOOKED_gather(vec2(HOOKED_pos + vec2(0.5) * HOOKED_pt), 0);
	float e = efhi.w;
	float f = efhi.z;
	float h = efhi.x;
	vec3 abd = HOOKED_gather(vec2(HOOKED_pos - vec2(0.5) * HOOKED_pt), 0).wzx;
	float b = abd.y;
	float d = abd.z;
	#if (CAS_BETTER_DIAGONALS == 1)
		float a = abd.x;
		float i = efhi.y;
	#endif
#else
	float e = HOOKED_tex(HOOKED_pos).r;
	float f = HOOKED_texOff(vec2(1.0, 0.0)).r;
	float h = HOOKED_texOff(vec2(0.0, 1.0)).r;
	#if (CAS_BETTER_DIAGONALS == 1)
		float a = HOOKED_texOff(vec2(-1.0, -1.0)).r;
		float i = HOOKED_texOff(vec2(1.0, 1.0)).r;
	#endif
	float b = HOOKED_texOff(vec2( 0.0, -1.0)).r;
	float d = HOOKED_texOff(vec2(-1.0,  0.0)).r;
#endif
#if (CAS_BETTER_DIAGONALS == 1)
	float c = HOOKED_texOff(vec2( 1.0, -1.0)).r;
	float g = HOOKED_texOff(vec2(-1.0,  1.0)).r;
#endif

	float mnL = min(min(min(d, e), min(f, b)), h);
	float mxL = max(max(max(d, e), max(f, b)), h);
#if (CAS_BETTER_DIAGONALS == 1)
	float mnL2 = min(mnL, min(min(a, c), min(g, i)));
	mnL += mnL2;
	float mxL2 = max(mxL, max(max(a, c), max(g, i)));
	mxL += mxL2;
#endif

	const float bdval = bool(CAS_BETTER_DIAGONALS) ? 2.0 : 1.0;
#if (CAS_GO_SLOWER == 1)
	float ampL = clamp(min(mnL, bdval - mxL) / mxL, 0.0, 1.0);
	ampL = sqrt(ampL);
#else
	float ampL = clamp(min(mnL, bdval - mxL) * APrxLoRcpF1(mxL), 0.0, 1.0);
	ampL = APrxLoSqrtF1(ampL);
#endif

	const float peak = -(mix(8.0, 5.0, clamp(SHARPENING, 0.0, 1.0)));
	float wL = ampL / peak;

	float Weight = 1.0 + 4.0 * wL;
	vec4 pix = vec4(0.0, 0.0, 0.0, 1.0);
	pix.r = ((b + d + f + h) * wL) + e;
#if (CAS_GO_SLOWER == 1)
	pix.r /= Weight;
#else
	pix.r *= APrxMedRcpF1(Weight);
#endif
	pix.r = clamp(pix.r, 0.0, 1.0);

#if (TARGET_TRC == 1)
	pix.r = To709(pix.r);
#elif (TARGET_TRC == 2)
	pix.r = ToPq(pix.r);
#elif (TARGET_TRC == 3)
	pix.r = ToSrgb(pix.r);
#elif (TARGET_TRC == 4)
	pix.r = pow(pix.r, float(1.0 / 2.4));
#elif (TARGET_TRC == 5)
	pix.r = ToHlg(pix.r);
#elif (TARGET_TRC == 6)
	pix.r = pow(pix.r, float(1.0 / CUSTOM_GAMMA));
#endif

	return pix;
}
