import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDebounce, useDebouncedCallback } from '@/lib/hooks/useDebounce'

describe('useDebounce', () => {
  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'first' } }
    )

    expect(result.current).toBe('first')

    // Change value multiple times quickly
    rerender({ value: 'second' })
    expect(result.current).toBe('first') // Still old value

    rerender({ value: 'third' })
    expect(result.current).toBe('first') // Still old value

    // Wait for debounce delay
    await waitFor(() => expect(result.current).toBe('third'), { timeout: 500 })
  })

  it('should update immediately when delay is 0', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 0),
      { initialProps: { value: 'first' } }
    )

    rerender({ value: 'second' })
    expect(result.current).toBe('second')
  })

  it('should handle number values', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 0 } }
    )

    expect(result.current).toBe(0)

    rerender({ value: 100 })
    await waitFor(() => expect(result.current).toBe(100), { timeout: 300 })
  })
})

describe('useDebouncedCallback', () => {
  it('should debounce callback execution', async () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    // Call multiple times
    act(() => {
      result.current('arg1')
      result.current('arg2')
      result.current('arg3')
    })

    // Should not have called yet
    expect(callback).not.toHaveBeenCalled()

    // Wait for debounce
    await waitFor(() => expect(callback).toHaveBeenCalledTimes(1), { timeout: 400 })
    expect(callback).toHaveBeenCalledWith('arg3') // Only last call
  })

  it('should cancel previous timeout on new call', async () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 200))

    act(() => {
      result.current('first')
    })

    // Wait 100ms (half of delay)
    await new Promise(r => setTimeout(r, 100))

    act(() => {
      result.current('second')
    })

    // Wait for debounce
    await waitFor(() => expect(callback).toHaveBeenCalledTimes(1), { timeout: 300 })
    expect(callback).toHaveBeenCalledWith('second')
  })

  it('should cleanup timeout on unmount', () => {
    const callback = vi.fn()
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current('test')
    })

    unmount()

    // Callback should not be called after unmount
    expect(callback).not.toHaveBeenCalled()
  })
})
