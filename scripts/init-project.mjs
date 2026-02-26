#!/usr/bin/env node
import { main } from "./init-project/index.mjs"

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
