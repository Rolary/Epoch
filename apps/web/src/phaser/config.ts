import * as Phaser from "phaser";
import { HomeScene } from "./scenes/HomeScene.js";

export function createPhaserGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: "100%",
    height: "100%",
    backgroundColor: "#0D0D1A",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [HomeScene],
    render: {
      antialias: true,
      roundPixels: false,
    },
  });
}
