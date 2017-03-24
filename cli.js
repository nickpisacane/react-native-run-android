#!/usr/bin/env node

const { spawn, execSync } = require('child_process')
const path = require('path')
const shell = require('shelljs')
const inquirer = require('inquirer')
const chalk = require('chalk')

const APP_NAME = 'react-native-run-android'
const RN_URI = 'https://facebook.github.io/react-native/docs/getting-started.html'
const REQUIRED_BINS = [
  'react-native',
  'emulator',
  'adb'
]

const whichEmulator = shell.which('emulator')
let emulatorProc = null
let reactNativePackagerProc = null
let reactNativeProc = null

const showDepFailureMessgae = () => console.error(
  chalk.red(`Please refer to `) + chalk.blue(`${RN_URI}`) +
  ` for installation/setup instructions`
)

const requireBin = bin => {
  if (!shell.which(bin)) {
    console.error(chalk.red(`${APP_NAME} requires ${bin}.`))
    showDepFailureMessgae()
    process.exit(1)
  }
}

const getDevices = () => shell.exec(`emulator -list-avds`).stdout
  .split(/\n/)
  .map(s => s.trim())

const adbDeviceIsRunning = () => /emulator-\d+\s+device/.test(
  execSync(`adb devices`).toString()
)

const pollADBDevice = (maxTime = 60000) => new Promise((resolve, reject) => {
  const start = Date.now()
  const timer = setInterval(() => {
    if (adbDeviceIsRunning()) {
      clearInterval(timer)
      resolve()
    }
    if (Date.now() - start >= maxTime) {
      clearInterval(timer)
      reject(new Error('No device running'))
    }
  })
})

const emulateDevice = device => {
  console.log(chalk.blue(`Starting emulator for device ${device}`))
  emulatorProc = spawn('emulator', [`@${device}`], {
    cwd: path.dirname(whichEmulator.stdout),
    stdio: ['pipe', process.stdout, process.stderr]
  })

  return pollADBDevice().then(() => {
    console.log(chalk.blue(`Device is running`))
    return true
  })
}

const startReactNativePackager = () => {
  console.log(chalk.blue(`Starting react-native package server`))
  reactNativePacakgerProc = spawn('react-native', ['start'], {
    stdio: ['pipe', process.stdout, process.stderr]
  })

  return Promise.resolve()
}

const startReactNative = () => {
  console.log(chalk.blue(`Starting react-native`))
  reactNativeProc = spawn('react-native', ['run-android'], {
    stdio: ['pipe', process.stdout, process.stderr]
  })
}

const main = () => {
  REQUIRED_BINS.forEach(requireBin)

  const devices = getDevices()

  if (!devices || !devices.length) {
    console.error(chalk.red(`Please create a virtual device`))
    showDepFailureMessgae()
    process.exit(1)
  }

  inquirer.prompt([
    {
      type: 'list',
      name: 'device',
      message: 'Which device would you like to use?',
      choices: devices
    }
  ])
    .then(answer => {
      const { device } = answer

      return Promise.all([
        emulateDevice(device),
        startReactNativePackager()
      ])
        .then(() => startReactNative())
    })
    .catch(err => {
      console.error(chalk.red`Something failed:\n`, err)
    })
}

main()
