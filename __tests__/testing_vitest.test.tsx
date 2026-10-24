import { expect, test, vi} from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '../src/app/login/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

test('Testing vitest - Seeing if LoginPage has a sign in button', () => {
  render(<LoginPage />)
  expect(screen.getByRole('button', { name: "Sign in" })).toBeDefined()
})