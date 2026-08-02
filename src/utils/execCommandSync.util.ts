/**
 * @file Promise encapsulates asynchronous execution of commands via spawn
 * @module utils/execCommandSync.util
 */

import { spawn } from 'child_process'

export const execCommand = async (command: string, args: string[] = []) => {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn(command, args, { shell: false })
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Process exited with code ${code}`))
      } else {
        resolve(stdout || stderr)
      }
    })

    proc.on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * 执行完整 shell 命令（仅用于可信输入场景，如内部生成的命令）
 */
export const execShellCommand = async (command: string) => {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn(command, [], { shell: true })
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Process exited with code ${code}`))
      } else {
        resolve(stdout || stderr)
      }
    })

    proc.on('error', (err) => {
      reject(err)
    })
  })
}
