import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('desktop release distribution', () => {
  it('checks for signed updates only through the branded release domain', () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), 'src-tauri/tauri.conf.json'), 'utf8'),
    ) as { plugins: { updater: { endpoints: string[] } } }

    expect(config.plugins.updater.endpoints).toEqual([
      'https://releases.apolos.io/latest.json',
    ])
  })

  it('publishes installers and manifests to the configured S3 bucket', () => {
    const workflow = readFileSync(
      resolve(process.cwd(), '.github/workflows/release.yml'),
      'utf8',
    )

    expect(workflow).toContain('secrets.RELEASES_S3_ACCESS_KEY_ID')
    expect(workflow).toContain('secrets.RELEASES_S3_SECRET_ACCESS_KEY')
    expect(workflow).toContain('vars.RELEASES_S3_BUCKET')
    expect(workflow).toContain('vars.RELEASES_S3_ENDPOINT')
    expect(workflow).toContain('vars.RELEASES_PUBLIC_URL')
    expect(workflow).toContain('s3://$RELEASES_BUCKET/latest/')
    expect(workflow).toContain('s3://$RELEASES_BUCKET/latest.json')
    expect(workflow).toContain('s3://$RELEASES_BUCKET/release-manifest.json')
  })
})
