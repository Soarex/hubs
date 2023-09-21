import { handHoverSystem } from "./bit-hand-hover-system";
import { holdSystem } from "./hold-system";
import { dontHoldWithHandAndRemote, dontHoverAndHold } from "./not-hovered-if-held";
import { paths } from "./userinput/paths";

export function interactionSystem(world, cursorTargettingSystem, t, aframeSystems) {
  cursorTargettingSystem.tick(t); // handles hovers for cursors
  handHoverSystem(world, aframeSystems.interaction);
  holdSystem(world, aframeSystems.userinput);
  dontHoldWithHandAndRemote(world);
  dontHoverAndHold(world);
  // Copies hovered/held state (only for aframe entities) for querying by legacy systems/components
  aframeSystems.interaction.updateLegacyState();

  aframeSystems.userinput.get(paths.device.keyboard.key('a'))
}
