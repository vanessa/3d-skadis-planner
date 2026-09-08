# Wall distance

2026-09-08. A `Wall distance` select in the Mounting section picks how far
the boards stand off the wall, and every MakerWorld link then points at the
print profile for that distance.

## Facts (from the MakerWorld API, 2026-09-08)

| Model | 10 mm | 15 mm | 20 mm |
|---|---|---|---|
| Multi Board Wall Mount (861073) | profile 1609221 | 1609217 | 811358 |
| Single wall mount (420877) | 323619 | none | 323616 |
| Screw spacers (418874) | 321444 | 321441 | 321437 |

Profile links have the form `https://makerworld.com/en/models/<id>#profileId-<profile>`.

## Design

- `MountSystem.profiles` and `HardwareItem.profiles`: optional maps from
  distance in mm to a profile URL. `wallDistances(system)` lists the
  system's distances (sorted keys of `system.profiles`); a system without
  profiles offers no distance and shows no select.
- Wall mounts offer 10 and 20 mm (the single mount has no 15 mm profile);
  spacers offer 10, 15 and 20 mm. The default is 10 mm
  (`DEFAULT_WALL_DISTANCE_MM`); `defaultWallDistance(system)` falls back to
  the system's smallest distance if 10 is not offered.
- `resolveMountSystem(system, mm)` returns a copy whose `url` and item
  `link`s are the profile URLs for `mm` (falling back to the plain ones).
  Consumers (`PrintList`, `hardwareMarkers`, the TXT export) keep taking a
  `MountSystem`.
- Form: `wallDistance` (string, default `'10'`). Changing the system keeps
  the distance if the new system offers it, else picks its default. Stored
  forms with a distance the stored system does not offer fall back to the
  default.
- TXT export: `Hardware (Wall mounts (AU3D), 10 mm from the wall)` and
  `Mount files:` points at the profile.
- The spacer item is renamed to `Screw spacer`; the distance is carried by
  the select and the TXT header.
