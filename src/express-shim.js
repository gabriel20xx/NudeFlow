// Central Express resolution shim for NudeFlow when running inside monorepo tests where
// NudeFlow dependencies may not be installed. Tries local first, then shared sibling package.
import { fileURLToPath } from 'url';
import path from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // .../NudeFlow/src

function resolveFrom(baseFile, pkg) {
  try {
    const req = createRequire(baseFile);
    return req(pkg);
  } catch { return null; }
}

let expressMod = null;
// Try local NudeFlow installation (../../node_modules)
expressMod = resolveFrom(path.resolve(__dirname, '..', 'package.json'), 'express');
if(!expressMod){
  // Try sibling NudeShared package
  expressMod = resolveFrom(path.resolve(__dirname, '..', '..', 'NudeShared', 'package.json'), 'express');
}
if(!expressMod){
  throw new Error('[express-shim] Unable to locate express in NudeFlow or NudeShared node_modules. Install dependencies or adjust shim.');
}

export default expressMod;
export const express = expressMod;