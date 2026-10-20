// Platform + token names and logo — the ONE place to change them.
//
// 2026-10-20: Omen renamed the platform "Omen Arcade" (was OmenX / OMENX Manager)
// and the token OMCADE (was OMENX, new contract 0x995586c1ef10c3cbaf155a62f62d65310d0d4c1f).
// Omen asked games to use these names in their own UI.
//
// These are DISPLAY names only. Anything that talks to Omen's API keeps their API's
// own names: the currency is still sent as 'OMENX' (paymentCurrency, balance symbol,
// pricesInCurrency.OMENX). Do not swap those for TOKEN_NAME.

export const TOKEN_NAME = 'OMCADE';
export const PLATFORM_NAME = 'Omen Arcade';

// Player-facing Omen links (token tools moved to app.omcade.com; old links forward).
export const ARCADE_URL = 'https://app.omen.foundation';
export const TOKEN_SITE_URL = 'https://app.omcade.com';

// OMCADE logo, 64×64 transparent PNG, inlined so it can't go missing.
export const TOKEN_LOGO_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAwFBMVEUhES+lpaVnZ2daK67JyclnHLN/En/W1tY0GmN/f/8SCEo8HXlFKHtEGotKIZVHJHNkLsW3t7diKcU/H4h/AP+BL/+qVarR0dHb29sAAAB8Mvv9/f2CNP7///9sMdTZ2dlZKbE5GXNNJZRmLcno6OhHI44AAH+qVf85GnMGBA0oFlRVJ6p7L/oAAP9LI5P/f//t7e2pqanW1tY/P3+6urr/AP8RCi1VAFVVVf8oFE5lLMc/P79VVaqzs7Pa2to/AH+sksnpAAAAQHRSTlMbGw7UYAMCoF0CIIiGYJ9g0WG6iAL7Az3PAP7+/gH4/c1pbu/TkQIDViVNsPwBqwLwBZEETQEqAwM61AQDN6oE3Niy6wAAA/9JREFUeNqdl9la6jAQgMOiICIuZ52S9LQWKEvLKiCC+P5vdWbShWapgvN5IWnyd/ZMGZTKCqB9DzBsA7yW72KlT2aw8ZxngDvHY/jjUsAVgO9yAvgOD3yAw2WAGxhNHRQJiLgzoaXzAbg4rvEcgMJrY4DtuYA9wNSR5wkwlP9wt2/3pQkYAOy89HyuARIcbwfrwdcADN6tyyNHBzicu758/DkghFEte70KICVqI8MMFbBNgucUAcPCT6nEthwQAvSd4nkdgA/7cpsV0FrD2OPKedWExBMeBrRlA+yl99TdhgbSjNuiL3OAoNTnztcACugGtxsa+AE3txomJOtUHCpgwKbmPudXCQDJUzaIC4Ar6HPrPmlCZHnC+1SwOUDAkxXgbdZr5nEb4Sl1Q+aDwALg7hh+XsPOtbEDgDgHDGBj2+R0KLYf0LE9c1swyAFXZqykAUknm4Fns2+YOCEF9G0GtJK0JyNMQuZFlrxjYnmHj9qnMbq18CeJfqkTTSV57VQ0of15HoXYEgQebGCdAa6BBaaFsnlJABppplATl3M52PJxlwM+8PLQAVO16m+gZhhxJ31EgFcjkcnAWO20I52AYQhzJ2pBoBTUbqIDjPVm4RVS+U171oHfevd9xbtCqQn+lgGMREa2iHVALLRYcndEXmTUZYeGAVvbdasbMaRtjJrhs+qeH/Z54KAmPDWLUAK0REbVLDcYRWKtmorJHKZOfOBaisU2QAzM1bwoUoCSyKl3raJEi3oKAQZatWZVYpOaquqOqgTz0dfrtFRUZ2G9fCAg1BIZAaJs7JoU+yt15j0ChMbF5ZJxiGqG6z2Fqa7hNMrEZRbE0C+6iz+QEzGRT0HAcawps9YqlN/jTuECDTCZGTslMucBHg8XYHcCLi6wDTaDkx1jYOyUyHjhjWC9on3yTxVcqCBktaYJMiFEmMx7NoMpT17/NkQ/4ab33ryOWxUt6Fd93ntHCtbJEL2G4Yiwb81Y2pHlHBji66vLLkrvRbED/33p0fqyCqKKQeoHPIoi6ilMJjKngRpW+b5sa/76BJuRcT5p4jQS8QeGgFaAWY1jfYjbK8duLr16qgRp3zutHysgFliG93jOJcAddzPnNebdojTQ5AU5r6EsSw+hwjSO+who0xx9qBS0P21tkAYaNiVXDjSRtxHARhBeF6xUpPdiYqWHmHTmiMlU3mpWniPSmdu0rQvdyrOEnInNhNH5x+53ZP6YtjQh3o/fARwrQuTzweP80uOUJvnVVhVKCp0jlKiiMKFQEl+gRO9PXirZnEhKLM/13rJQrKxYceclAxX1wvbBQUV3PO/1ZZ88wlYQn73e+OgSZTVRLMTPP/uwKuv/yuRvxWyW/wFJSLCC32intQAAAABJRU5ErkJggg==';
