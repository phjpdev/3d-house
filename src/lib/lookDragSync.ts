/**
 * When the user drags to look around, we skip opening an exhibit on that same gesture
 * (R3F click can still fire after a small pointer move).
 */
export const lookDragSync = {
  /** True after a drag gesture with meaningful pointer movement; cleared after exhibit checks it */
  blockNextExhibitClick: false,
}
