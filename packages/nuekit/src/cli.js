#!/usr/bin/env bun

import { sep } from 'node:path'

import esMain from 'es-main'

import { log, colors, getVersion, getEngine } from './util.js'


// [-npe] --> [-n, -p, -e]
export function expandArgs(args) {
  const arr = []
  args.forEach(arg => {
    if (arg[0] == '-' && arg[1] != '-' && arg[2]) {
      arg.slice(1).split('').forEach(el => arr.push('-' + el))
    } else {
      arr.push(arg)
    }
  })
  return arr
}

// TODO: tests
export function getArgs(argv) {
  const commands = ['serve', 'build', 'init', 'create']
  const args = { paths: [], root: null }
  const checkExecutable = /[\\\/]nue(\.(cmd|ps1|bunx|exe))?$/
  let opt

  expandArgs(argv.slice(1)).forEach((arg, i) => {
    // skip
    if (arg.endsWith(sep + 'cli.js') || checkExecutable.test(arg) || arg == '--') {

    // test suite
    } else if (arg.endsWith('.test.js')) {
      args.test = true

    // command
    } else if (commands.includes(arg)) {
      args.cmd = arg

    // options
    } else if (!opt && arg[0] == '-') {

      // booleans
      if (['-p', '--production'].includes(arg)) args.is_prod = true
      else if (['-v', '--version'].includes(arg) && !args.cmd) args.version = true
      else if (['-n', '--dry-run'].includes(arg)) args.dryrun = true
      else if (['-h', '--help'].includes(arg)) args.help = true
      else if (['-v', '--verbose'].includes(arg)) args.verbose = true
      else if (['-b', '--esbuild'].includes(arg)) args.esbuild = true
      else if (['-d', '--deploy'].includes(arg)) args.deploy = args.is_prod = true
      else if (['-I', '--incremental'].includes(arg)) args.incremental = true

      // string values
      else if (['-e', '--environment'].includes(arg)) opt = 'env'
      else if (['-r', '--root'].includes(arg)) opt = 'root'
      else if (['-P', '--port'].includes(arg)) opt = 'port'

      // bad options
      else throw `Unknown option: "${arg}"`

    } else if (arg && arg[0] != '-') {
      if (opt) {
        args[opt] = opt == 'port' ? Number(arg) : arg
        // Number(alphabetic characters) is falsy. Check if port is really set:
        if (opt != 'port' || (opt == 'port' && args.port)) opt = null
      }
      else args.paths.push(arg)
    } else if (opt) throw `"${opt}" option is not set`
  })

  if (opt) throw `"${opt}" option is not set`

  return args
}

async function printHelp() {
  const { getHelp } = await import('./cli-help.js')
  console.info(getHelp())
}

async function printVersion() {
  const v = await getVersion()
  log(`Nue ${v} ${colors.green('•')} ${getEngine()}`)
  return v
}

async function runCommand(args) {
  const { createKit } = await import('./nuekit.js')
  const { cmd = 'serve', dryrun, deploy, root = null, port } = args
  const init = cmd == 'init'

  if (!root) args.root = '.' // ensure root is unset for create, if not set manually

  console.info('')

  // create nue
  if (cmd == 'create') {
    const { create } = await import('./create.js')
    return await create({ root, name: args.paths[0], port })
  }

  args.nuekit_version = await printVersion()

  const nue = await createKit(args)
  if (!nue) return

  // deployer (private repo)
  const { deploy: deployer } = deploy ? await import('nue-deployer') : {}

  // build
  if (init) {
    await nue.init(true)
    if (deploy) await deployer({ root: nue.dist, init: true })

  } else if (dryrun || deploy || args.paths[0] || cmd == 'build') {
    const paths = await nue.build(args.paths)
    if (!dryrun && deploy && paths[0]) await deployer({ paths, root: nue.dist, init })

  // serve
  } else {
    await nue.serve()
  }
}

// Only run main when called as real CLI
if (esMain(import.meta)) {

  const args = getArgs(process.argv)

  // help
  if (args.help) {
    await printHelp()

  // version
  } else if (args.version) {
    await printVersion()

  // command
  } else if (!args.test) {
    try {
      await runCommand(args)
    } catch (e) {
      console.info(e)
    }
  }
}
