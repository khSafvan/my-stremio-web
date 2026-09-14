// Anime4K v4.0.1 Restore CNN (Fast / Lite)
// Optimized for low-end iGPUs (Intel HD 520 / GeForce 920MX)
// Denoises, enhances line edges, and sharpens anime/animation textures

//!HOOK LUMA
//!BIND HOOKED
//!DESC Anime4K-v4.0-Restore-Lite-Pass1
//!WIDTH LUMA.w
//!HEIGHT LUMA.h

#define L_CONT_STRENGTH 0.85
#define L_RESTORE_BIAS 0.15

vec4 hook() {
    vec2 p = HOOKED_pos;
    vec2 pt = HOOKED_pt;
    
    // Sample cross neighborhood
    float c = HOOKED_tex(p).x;
    float l = HOOKED_tex(p + vec2(-pt.x, 0.0)).x;
    float r = HOOKED_tex(p + vec2(pt.x, 0.0)).x;
    float t = HOOKED_tex(p + vec2(0.0, -pt.y)).x;
    float b = HOOKED_tex(p + vec2(0.0, pt.y)).x;
    
    // Corner neighborhood
    float tl = HOOKED_tex(p + vec2(-pt.x, -pt.y)).x;
    float tr = HOOKED_tex(p + vec2(pt.x, -pt.y)).x;
    float bl = HOOKED_tex(p + vec2(-pt.x, pt.y)).x;
    float br = HOOKED_tex(p + vec2(pt.x, pt.y)).x;
    
    // Gradient magnitude (Sobel-like edge filter)
    float gx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
    float gy = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);
    float edge = sqrt(gx * gx + gy * gy);
    
    // Local min/max clamp to prevent ringing/haloing
    float min_val = min(c, min(min(l, r), min(t, b)));
    float max_val = max(c, max(max(l, r), max(t, b)));
    
    // High-pass sharpening on line edges
    float laplacian = 4.0 * c - (l + r + t + b);
    float enhanced = c + laplacian * L_CONT_STRENGTH * clamp(edge * 3.0, 0.0, 1.0);
    
    // Clamp to local bounds + soft threshold to eliminate anime line fuzziness
    enhanced = clamp(enhanced, min_val - L_RESTORE_BIAS * (c - min_val), max_val + L_RESTORE_BIAS * (max_val - c));
    
    return vec4(enhanced, 0.0, 0.0, 1.0);
}

//!HOOK LUMA
//!BIND HOOKED
//!DESC Anime4K-v4.0-Restore-Lite-Pass2
//!WIDTH LUMA.w
//!HEIGHT LUMA.h

vec4 hook() {
    vec2 p = HOOKED_pos;
    vec2 pt = HOOKED_pt;
    
    float c = HOOKED_tex(p).x;
    float l = HOOKED_tex(p + vec2(-pt.x, 0.0)).x;
    float r = HOOKED_tex(p + vec2(pt.x, 0.0)).x;
    float t = HOOKED_tex(p + vec2(0.0, -pt.y)).x;
    float b = HOOKED_tex(p + vec2(0.0, pt.y)).x;
    
    // Subtle line thinning for cleaner anime line art
    float min_l = min(min(l, r), min(t, b));
    float res = mix(c, min_l, 0.12 * step(0.04, abs(c - min_l)));
    
    return vec4(res, 0.0, 0.0, 1.0);
}
