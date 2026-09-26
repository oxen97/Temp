# Interaction runtime support by object type

Audit and expansion work: 2026-09-24. This matrix distinguishes runnable effects
from the larger set of planned controls in the Interaction panel. A dropdown
entry alone is not evidence that Preview executes an effect.

## Existing playback and type expansion

| Effect | Lines / pen paths | Images | Videos | 3D objects |
| --- | --- | --- | --- | --- |
| Move, Scale, Rotate | Existing 2D playback | Existing | Existing | Shared plane-transform runtime; transform composition unit tests passed |
| Opacity, Show / Hide, Skew, Shake | Existing 2D playback | Existing | Existing | Shared transform/material runtime; skew and source-alpha preservation unit tests passed; not every effect/trigger pair has a browser test |
| Blur | Existing 2D playback | Existing | Existing | Per-object compositor desktop Preview test passed; another object stays unchanged and toggle-off restores pixels |
| Shadow | Existing 2D playback | Existing | Existing | Per-object screen-space compositor desktop Preview test passed; another object stays unchanged and toggle-off restores pixels |
| Strand Bend | Existing open-path playback | New media deformation; desktop authoring/Preview test passed | New media deformation; desktop authoring/Preview test passed | New mesh deformation; primitive and imported static GLB desktop authoring/Preview tests passed |
| Wave / Curve Deform | Existing path playback | New media deformation; desktop authoring/Preview test passed | New media deformation; desktop authoring/Preview test passed | New mesh deformation; primitive and imported static GLB desktop authoring/Preview tests passed |
| Emit Event | Existing Click / Tap Logic route | Existing | Existing runtime, newly exposed in panel | New event bridge implemented; no new dedicated browser verification |
| Spawn Instance | Existing 2D source/template runtime; 3D templates now supported | Existing | Existing runtime, newly exposed in panel | Independent 3D clone helper and event bridge; selected-object and blank-artwork desktop cases passed |
| Emit Pointer Trail | Existing Drag emitter | Existing | Existing runtime, newly exposed in panel | Pointer event bridge; selected-object and blank-artwork desktop cases passed, including expiration after release |
| Snap / Return / Attach to Target | Existing 2D target commands | Existing | Existing | New target registry and 3D placement integration; desktop target-drop cases passed for 3D → 3D and 3D → 2D |
| Open / Close Modal | Existing 2D modal commands | Existing | Existing | Bridge to 2D modal targets; Click/Hover opening, Escape, and backdrop-free 3D closing desktop cases passed |
| Liquid Merge | Existing vector/metaball path | New texture-preserving connector; uploaded-image desktop Preview test passed | New texture-preserving connector; live uploaded-video frame desktop Preview test passed | New material-preserving bridge; primitive desktop authoring/Preview test passed |
| Gravity motion / bounce simulation | Existing Rapier 2D path | Existing 2D path | Existing 2D path | Existing Rapier 3D path and static 2D proxies |

Strand Bend is offered for Drag and Pointer Move. Wave / Curve Deform is offered
for Pointer Move. Mixed selections expose the intersection of their effect
choices, independent of selection order. An image/video selection therefore
keeps common pointer effects. A mixed 2D/3D selection keeps the shared bend,
wave, emitter, modal, and placement commands. 2D placement sources retain their
2D target constraints; 3D placement sources can use the live target registry.
Single-target pair effects remain excluded from multi-selection.

Spawn and Pointer Trail honor Selected Object and Entire Artwork for 3D sources;
whole-artwork handlers include 3D sources without also emitting a duplicate mesh
event. Events crossing from 3D to the page use projected artboard coordinates,
and 3D spawn placement unprojects at the template's retained depth. Source
template choices persist in the same interaction fields as 2D templates.

Modal targets referenced by visible 3D openers start hidden, as for 2D openers.
Hidden 3D openers do not hide their targets. Hover start can open a modal.
A 3D Close Modal source remains usable only with **Backdrop off**: an enabled
backdrop intentionally blocks background 3D interaction. With Backdrop on, use
a 2D close control inside the modal, or enabled Escape/backdrop dismissal.

2D and 3D target-occupancy registries remain separate. A 3D source can target a
2D object, but capacity/occupied-target rules are not jointly enforced across
both source dimensions. 2D sources still cannot select 3D placement targets.

Additional Wave targets are explicitly 2D: lines, pen paths, images, and videos.
3D objects can own a Wave interaction; an unrelated 3D target cannot be selected
through the 2D target list because its coordinate conversion is not provided.

Media Liquid Merge accepts other media and filled rectangle/circle/triangle/star
targets with **Near Target** only. It adds a texture-preserving connector between
separated outlines, not a Boolean/pixel-silhouette union. Overlapping or contained
media retain their original appearance and the connector disappears. Media-to-line/pen
pairs and all 2D-to-3D Liquid Merge pairs are excluded. Vector While Overlapping
therefore excludes media targets. 3D Liquid Merge accepts another 3D primitive,
vector, or imported model and retains its existing overlap trigger.

The same serialized `InteractionDefinition` fields carry media and 3D bend/wave
settings. Store interaction actions now address either `page.elements` or
`page.objects3d` and preserve undo/redo. The shared Rotate amount is stored as
`rotateTo`; the working 3D Z rotation input uses that field. Planned 3D X/Y
rotation, depth, material, and animation UI state remains separate.

The working Shadow effect is a screen-space silhouette filter, including on
3D objects. Offset X/Y, blur, and the color's alpha persist in shared fields.
It does not implement light-cast 3D shadows, depth offset, or spread. The
unconnected Shadow Z/Spread/opacity-only controls are no longer presented;
the color field stores the actual CSS color including alpha.

## Camera Rotate (added 2026-09-27)

Camera Rotate is offered for every element type and now runs in Preview. The
artwork camera orbits the Scene camera target by the sum of all Camera Rotate
contributions on the page; 2D elements stay fixed on screen. The editor camera
stays front-facing. Full rules are in `INTERACTION-TAB.md` ("Camera Rotate 실행
규칙").

| Area | Runtime behavior |
| --- | --- |
| Triggers | Drag (signed, unlimited, per Track distance; Entire artwork or Selected object), Pointer Move (offset from centre / Track distance, clamped ±1), Click / Tap toggle, Hover, After Delay, Scroll / Swipe, Drop On/Outside Target, Drag Enter/Leave Target |
| Axes | X raises the camera (elevation limited to ±85°), Y turns it right around the vertical axis, Z rolls the picture clockwise |
| RESET | Keep final state: Drag accumulates across drags, Pointer Move / Hover hold the last angle. Other choices return to the initial camera |
| HOW | Direct (continuous input follows Smoothing; events use Duration, Delay, Easing), Spring, Bounce, Inertia (a flick keeps turning; Initial velocity, Friction, Deceleration). Reduced motion moves directly |
| Projection | The first enabled camera effect on the page sets the Preview camera's Projection and Field of view (1–160°). Orthographic orbits stay outside every object |
| Gestures | Entire-artwork drags start anywhere except on an element or object that owns a click, drag or drop gesture. 3D Selected-object drags use screen-space movement |

Validation: unit tests cover input mapping, persistence, pitch limits, inertia
(including sparse pointer samples on slow devices), springs, eased and delayed
events, the orbit pose, projection selection, the orthographic orbit distance,
3D-object clicks/drags and pointer claiming, and the Preview's artwork drag,
Pointer Move, click and projection wiring. A desktop Playwright case authors
Drag / Entire artwork → Camera Rotate in the panel, checks persistence after a
panel remount, drags in Preview, confirms Keep final state, and confirms a new
Preview starts from the authored camera. The AMOUS Playground 08 SPACE browser
checks cover drag, keep, inertia, buttons that do not turn the camera, and
dragging from a 2D title.

## Planned controls that this expansion does not implement

These options already existed in the panel, but the audited viewer did not
execute their complete authored behavior:

- Distort, Color, Order, and Group Animation.
- Image Particle, Pixelate, Dissolve, and Trail (distinct from working Emit
  Pointer Trail).
- Text Reveal, Stroke Draw, Character Animation, and Word Animation.
- Video Play, Pause, Resume, and Seek commands.
- Bounce Off Target and Stack On Target pair effects. Gravity simulation is a
  separate existing path and does not make these commands complete.
- Camera Move, Zoom / Dolly, Look At and Shake (Camera Rotate runs; see below),
  lighting, post-processing, shader, look-at/orbit targeting, 3D material,
  model animation, morph, bone, joint, mesh, and face controls.
- Full collision/model/video lifecycle triggers and all advanced blending,
  timeline, constraint, and reset combinations.

Text-specific and media/model-specific commands retain their type constraints.
They are not interchangeable effects and have not been marked complete by this
type-expansion work.

## Validation handoff

Final `npm run check` passed lint, TypeScript, **540 tests in 57 files**, and the
static production build. Unit coverage includes policy intersections, panel
persistence, 3D store undo/redo and document round-trip, independent spawn
clones, transform/material restoration, and bounded bridge geometry/resources.
The nine media-bridge geometry tests include cropped/flipped UVs, rounded and
deformed boundaries, facing-edge attachment, and overlap/containment exclusion.

The combined desktop regression run passed **26 cases**, with one mobile-only
case skipped. It includes:

- Actual panel authoring, panel remount/persistence, and Preview deformation
  for an uploaded SVG image, recorded WebM video, 3D primitive, and uploaded
  subdivided static GLB. These verify changed media hit outlines and 3D canvas
  output, with unrelated demo effects disabled.
- Near Target connectors for uploaded images and live video frames. The video
  case caught a black-texture regression, corrected by using a real VideoTexture.
  Original media remain decoded and visible; connector pixels and live frame
  changes are checked.
- A 3D primitive material-preserving Liquid Merge bridge without shader errors.
- Isolated per-object 3D Blur and Shadow, checking an unchanged peer object and
  restoration of original pixels when toggled off.
- 3D-source target-drop cases with both 3D and 2D destinations.
- The ordinary-image Pinocchio regression.

The new `model-3d-generated-effects` desktop suite also passed all **six cases**:
selected-object/blank-artwork Spawn, selected-object/blank-artwork Pointer Trail
with mark expiration, Click opening plus Escape dismissal, and Hover opening
plus a second 3D object closing a backdrop-free modal. Final review corrections
also cover hidden opener filtering, projected event coordinates, and depth-aware
spawn unprojection; not every camera/depth combination has a browser case.
After those final code corrections, the generated-effects, target-drop,
visual-effects, and media/3D-liquid suites were rerun together: **13 desktop
cases passed in 35.8 seconds**. This is a final-code subset rerun, not 13
additional distinct regression cases.

These checks do **not** establish skinned-model or custom-shader compatibility,
mobile/touch behavior, cross-origin/CORS media, imported-model Liquid Merge,
every target/reset combination, or joint 2D/3D occupancy. Emit Event has no new
dedicated browser test. The texture-preserving connector is not a Boolean union,
and none of this validation completes the planned controls listed above.
