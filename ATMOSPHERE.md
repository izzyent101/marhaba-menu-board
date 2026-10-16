# Continuous coastal lighting

The v2.4 renderer retains the owner's original beach composition, surf loop and cloud heading artwork. The hours sit at x=210, with the entire block above the original tree line.

The old picture dissolve is removed. One daytime photograph supplies the foliage silhouette and cloud density at every time of day. Lighting changes on that same geometry. The night illustration supplies only extracted stars, a faint Milky Way, and a small lunar surface sample; its alternate clouds, tree shapes and baked-in moon never replace the daytime composition.

## Solar clock

Automatic mode calculates SunCalc sun and moon altitude, azimuth and lunar illumination for Minneapolis. It updates every second. The renderer interpolates angular directions over a fraction of a second, rather than interpolating day/night pictures. The camera faces south, so morning light is on the left and evening light is on the right. Disc directions, water reflection paths and direct illumination share these inputs. The illustrated star field is decorative and is not an astronomical star catalogue.

The temporary day preview samples today's actual solar clock from nine hours before local solar noon to ten hours after it. It plays in 90 seconds, can be paused or scrubbed, and never modifies the real clock or saves a simulated time. Normal Automatic mode progresses over the real day; it does not run the accelerated preview loop. Finishing the preview restores the selected lighting mode. Completing playback returns to that mode after an eight-second night hold; scrubbing or pausing cancels that automatic return.

## Atmospheric pass

A 128×64 texture integrates single Rayleigh and Mie scattering through a spherical atmosphere. Distances use kilometres: Earth radius 6360, top of atmosphere 6420, camera elevation 0.005. Exponential scale heights are 8 km for air and 1.2 km for aerosols, with an ozone absorption layer around 25 km. Sixteen quadratically distributed view samples and six light-path samples integrate optical depth; the planet occludes direct sunlight below its horizon.

The expensive pass runs at most ten times per second while solar directions change, and less often in ordinary real-time operation. The main pass composites its light with detailed photographic cloud density, canopy wind, the original moving water and sand. Gamma conversion occurs after compositing in linear light. Direct sunlight reddens through the same atmospheric density profile. Twilight, diffuse ambient illumination, exposure and moonlit visibility include calibrated artistic approximations, rather than a full spectral/multiple-scattering simulation. The surf retains its original 1280×720 source detail and loop.

References for the scattering model and terminology:

- Eric Bruneton, [Precomputed Atmospheric Scattering: a New Implementation](https://ebruneton.github.io/precomputed_atmospheric_scattering/). The implementation here is a smaller single-scattering integration, not Bruneton's full model or precomputed multiple-scattering algorithm.
- Three.js [Sky shader source](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Sky.js), an established practical atmospheric renderer. No Three.js runtime is bundled.

## Validation

- Unit checks cover every second of one complete solar day, seasonal daylight, daylight-saving boundaries, direct-beam reddening, gradual label ink, and saved hours/price migration.
- Browser checks exercise dawn, morning, midday, golden hour, sunset, blue hour and night; temporary preview controls and clock isolation; moving surf and its wrap; motion preferences; original video; GPU failure/retry; resize and saved edits.
- Output is capped at 1920 pixels wide and 30 fps. The scene pauses while hidden. Reduced motion pauses wind, clouds and surf while retaining the current solar lighting.
