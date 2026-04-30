/**
 * When the user drags to look around, we skip opening an exhibit on that same gesture
 * (R3F click can still fire after a small pointer move).
 */
export const lookDragSync = {
  /** True after a drag gesture with meaningful movement; cleared after exhibit checks it */
  blockNextExhibitClick: false,
  /** True while primary pointer is down on the canvas for look-drag (cursor uses grabbing) */
  lookDragging: false,
}
