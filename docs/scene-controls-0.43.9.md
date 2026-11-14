# Foundry 14 scene controls — 0.43.9

The manual rules modules register their tools in Foundry's scene-control palettes. Foundry 14 caches the available controls during its first scene-control render. In worlds with many modules, that render can occur before the tactical suite has registered every feature, leaving all suite buttons absent even though the modules and APIs are active.

After the manual suite finishes startup, the shared runtime now asks Foundry to rebuild the scene-control model with its supported `reset` render option. This restores all enabled manual-suite tools without enabling the NPC AI module.

For cover and concealment, draw Scene Regions first. Then select Region Controls and use **Cover / concealment zones**, represented by the cloud button. The dialog configures the selected scene's Regions; native Region Behaviors are not required.
