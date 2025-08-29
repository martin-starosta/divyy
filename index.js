#!/usr/bin/env node
import "dotenv/config.js";
import { DivvyCliApp } from "./src/cli/DivvyCliApp.js";
const app = new DivvyCliApp();
app.run();
