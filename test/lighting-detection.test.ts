import { describe, it, expect, beforeAll } from 'vitest'
import { analyzeLighting, getSuggestions, LightingAnalysis } from '@/lib/lighting-detector'

describe('Lighting Detection', () => {
  describe('analyzeLighting', () => {
    it('should return insufficient quality for very dark video', () => {
      // Mock video element with very dark pixels
      const mockCanvas = createMockCanvas(10, 10, 10) // RGB(10,10,10) = very dark
      const result = analyzeLighting(mockCanvas as any)
      
      expect(result.brightness).toBeLessThan(40)
      expect(result.quality).toBe('insufficient')
      expect(result.canProceed).toBe(false)
    })

    it('should return excellent quality for well-lit video', () => {
      // Mock video element with bright pixels
      const mockCanvas = createMockCanvas(200, 200, 200) // RGB(200,200,200) = bright
      const result = analyzeLighting(mockCanvas as any)
      
      expect(result.brightness).toBeGreaterThanOrEqual(180)
      expect(result.quality).toBe('excellent')
      expect(result.canProceed).toBe(true)
    })

    it('should return good quality for moderately lit video', () => {
      const mockCanvas = createMockCanvas(140, 140, 140)
      const result = analyzeLighting(mockCanvas as any)
      
      expect(result.brightness).toBeGreaterThanOrEqual(120)
      expect(result.brightness).toBeLessThan(180)
      expect(result.quality).toBe('good')
      expect(result.canProceed).toBe(true)
    })

    it('should return fair quality for dim lighting', () => {
      const mockCanvas = createMockCanvas(100, 100, 100)
      const result = analyzeLighting(mockCanvas as any)
      
      expect(result.brightness).toBeGreaterThanOrEqual(80)
      expect(result.brightness).toBeLessThan(120)
      expect(result.quality).toBe('fair')
      expect(result.canProceed).toBe(true)
    })

    it('should return poor quality for low light', () => {
      const mockCanvas = createMockCanvas(50, 50, 50)
      const result = analyzeLighting(mockCanvas as any)
      
      expect(result.brightness).toBeGreaterThanOrEqual(40)
      expect(result.brightness).toBeLessThan(80)
      expect(result.quality).toBe('poor')
      expect(result.canProceed).toBe(false)
    })
  })

  describe('getSuggestions', () => {
    it('should suggest turning on lights for very dark conditions', () => {
      const analysis: LightingAnalysis = {
        brightness: 30,
        quality: 'insufficient',
        recommendation: 'Too dark',
        canProceed: false
      }
      
      const suggestions = getSuggestions(analysis)
      
      expect(suggestions).toContain('🔦 Bật đèn trong phòng')
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('should suggest increasing brightness for dim conditions', () => {
      const analysis: LightingAnalysis = {
        brightness: 60,
        quality: 'poor',
        recommendation: 'Low light',
        canProceed: false
      }
      
      const suggestions = getSuggestions(analysis)
      
      expect(suggestions).toContain('💡 Tăng độ sáng đèn')
    })

    it('should suggest reducing brightness for overly bright conditions', () => {
      const analysis: LightingAnalysis = {
        brightness: 230,
        quality: 'excellent',
        recommendation: 'Too bright',
        canProceed: true
      }
      
      const suggestions = getSuggestions(analysis)
      
      expect(suggestions.some(s => s.includes('giảm'))).toBe(true)
    })

    it('should return empty suggestions for good lighting', () => {
      const analysis: LightingAnalysis = {
        brightness: 150,
        quality: 'excellent',
        recommendation: 'Perfect',
        canProceed: true
      }
      
      const suggestions = getSuggestions(analysis)
      
      expect(suggestions.length).toBe(0)
    })
  })

  describe('Brightness calculation', () => {
    it('should calculate grayscale brightness correctly', () => {
      // Test grayscale formula: 0.299R + 0.587G + 0.114B
      // RGB(100, 100, 100) should give brightness ~100
      const mockCanvas = createMockCanvas(100, 100, 100)
      const result = analyzeLighting(mockCanvas as any)
      
      // Allow small margin for rounding
      expect(result.brightness).toBeGreaterThanOrEqual(95)
      expect(result.brightness).toBeLessThanOrEqual(105)
    })

    it('should weight green channel more heavily', () => {
      // Green should contribute more to brightness (0.587 vs 0.299/0.114)
      const greenCanvas = createMockCanvas(0, 100, 0)
      const redCanvas = createMockCanvas(100, 0, 0)
      
      const greenResult = analyzeLighting(greenCanvas as any)
      const redResult = analyzeLighting(redCanvas as any)
      
      expect(greenResult.brightness).toBeGreaterThan(redResult.brightness)
    })
  })
})

/**
 * Helper function to create mock canvas with uniform color
 */
function createMockCanvas(r: number, g: number, b: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 100
  canvas.height = 100
  
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(100, 100)
  
  // Fill with uniform color
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = r     // Red
    imageData.data[i + 1] = g // Green
    imageData.data[i + 2] = b // Blue
    imageData.data[i + 3] = 255 // Alpha (fully opaque)
  }
  
  ctx.putImageData(imageData, 0, 0)
  
  // Create mock video element that returns this canvas
  const mockVideo: any = {
    videoWidth: 100,
    videoHeight: 100,
    readyState: 4
  }
  
  // Mock drawImage to use our test canvas
  const originalGetContext = HTMLCanvasElement.prototype.getContext as any
  HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, type: string, options?: any) {
    const ctx = originalGetContext.call(this, type, options) as CanvasRenderingContext2D | null
    if (ctx && type === '2d') {
      const originalDrawImage = ctx.drawImage.bind(ctx)
      ctx.drawImage = function(image: any, ...args: any[]) {
        if (image === mockVideo) {
          // Use our test canvas data instead
          const testImageData = imageData
          ctx.putImageData(testImageData, 0, 0)
        } else {
          originalDrawImage(image, ...args)
        }
      } as any
    }
    return ctx
  } as any
  
  return mockVideo
}
