import { Stack } from "expo-router";
// TypeScript doesn't have a declaration for this CSS side-effect import yet.
// @ts-ignore: Cannot find module or type declarations for side-effect import of '../global.css'.
import "../global.css";

export default function RootLayout() {
  return <Stack />;
}
