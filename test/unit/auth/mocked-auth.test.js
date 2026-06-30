'use strict'

const packageJson = require('../../../package.json')

describe('XSUAA mocked auth configuration', () => {

    test('package.json declares auth requirement', () => {
        expect(packageJson.cds.requires).toHaveProperty('auth')
    })

    test('development profile uses mocked auth', () => {
        const devAuth = packageJson.cds.requires.auth['[development]']
        expect(devAuth.kind).toBe('mocked')
    })

    test('production profile uses xsuaa', () => {
        const prodAuth = packageJson.cds.requires.auth['[production]']
        expect(prodAuth.kind).toBe('xsuaa')
    })

    test('admin user has all three roles (full hierarchy)', () => {
        const admin = packageJson.cds.requires.auth['[development]'].users.admin
        expect(admin.roles).toContain('SCMAdmin')
        expect(admin.roles).toContain('SCMAnalyst')
        expect(admin.roles).toContain('SCMViewer')
    })

    test('analyst user has Analyst and Viewer roles', () => {
        const analyst = packageJson.cds.requires.auth['[development]'].users.analyst
        expect(analyst.roles).toContain('SCMAnalyst')
        expect(analyst.roles).toContain('SCMViewer')
        expect(analyst.roles).not.toContain('SCMAdmin')
    })

    test('viewer user has only Viewer role', () => {
        const viewer = packageJson.cds.requires.auth['[development]'].users.viewer
        expect(viewer.roles).toEqual(['SCMViewer'])
    })

    test('each mocked user has a password', () => {
        const users = packageJson.cds.requires.auth['[development]'].users
        for (const user of Object.values(users)) {
            expect(user.password).toBeTruthy()
        }
    })
})