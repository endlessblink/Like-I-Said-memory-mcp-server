import React, { useState, useEffect } from 'react'

export function NavSpacingAdjuster() {
  const [rightSpacing, setRightSpacing] = useState(() => {
    try {
      const saved = localStorage.getItem('navRightSpacing')
      return saved ? Number(saved) || 20 : 20
    } catch {
      return 20
    }
  })
  
  const [leftSpacing, setLeftSpacing] = useState(() => {
    try {
      const saved = localStorage.getItem('navLeftSpacing')
      return saved ? Number(saved) || 22 : 22
    } catch {
      return 22
    }
  })
  
  const [containerPaddingLeft, setContainerPaddingLeft] = useState(() => {
    try {
      const saved = localStorage.getItem('containerPaddingLeft')
      return saved ? Number(saved) || 0 : 0
    } catch {
      return 0
    }
  })
  
  const [containerPaddingRight, setContainerPaddingRight] = useState(() => {
    try {
      const saved = localStorage.getItem('containerPaddingRight')
      return saved ? Number(saved) || 0 : 0
    } catch {
      return 0
    }
  })
  
  const [showAdjuster, setShowAdjuster] = useState(false)
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(false)

  useEffect(() => {
    try {
      // Ensure all values are numbers
      const safeRightSpacing = Number(rightSpacing) || 0
      const safeLeftSpacing = Number(leftSpacing) || 0  
      const safeContainerPaddingLeft = Number(containerPaddingLeft) || 0
      const safeContainerPaddingRight = Number(containerPaddingRight) || 0
      
      localStorage.setItem('navRightSpacing', safeRightSpacing.toString())
      localStorage.setItem('navLeftSpacing', safeLeftSpacing.toString())
      localStorage.setItem('containerPaddingLeft', safeContainerPaddingLeft.toString())
      localStorage.setItem('containerPaddingRight', safeContainerPaddingRight.toString())
      
      // Apply spacing to the navigation
      const navSection = document.querySelector('.nav-logo-section')
      const navContainer = document.querySelector('.nav-container')
      const spaceContainer = document.querySelector('.space-container')
      
      if (navSection) {
        (navSection as HTMLElement).style.marginRight = `${safeRightSpacing * 4}px`
      }
      
      if (navContainer) {
        (navContainer as HTMLElement).style.paddingLeft = `${safeLeftSpacing}px`
      }
      
      if (spaceContainer) {
        (spaceContainer as HTMLElement).style.paddingLeft = `${safeContainerPaddingLeft}px`
        (spaceContainer as HTMLElement).style.paddingRight = `${safeContainerPaddingRight}px`
      }
      
      // Show/hide alignment guides
      const guides = document.querySelectorAll('.alignment-guide')
      guides.forEach(guide => {
        (guide as HTMLElement).style.display = showAlignmentGuides ? 'block' : 'none'
      })
    } catch (error) {
      console.error('NavSpacingAdjuster error:', error)
    }
  }, [rightSpacing, leftSpacing, containerPaddingLeft, containerPaddingRight, showAlignmentGuides])

  if (!showAdjuster) {
    return (
      <button
        onClick={() => setShowAdjuster(true)}
        className="fixed bottom-4 right-4 z-50 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors"
      >
        ⚙️ Adjust Nav Spacing
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-4 w-96">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Navigation Position</h3>
        <button
          onClick={() => setShowAdjuster(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Left Position Control */}
        <div>
          <label className="text-gray-300 text-sm block mb-2">
            📍 Left position from edge: {leftSpacing}px
          </label>
          <input
            type="range"
            min="-50"
            max="200"
            value={leftSpacing}
            onChange={(e) => setLeftSpacing(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setLeftSpacing(-30)}
              className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
            >
              Far Left
            </button>
            <button
              onClick={() => setLeftSpacing(0)}
              className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
            >
              Edge
            </button>
            <button
              onClick={() => setLeftSpacing(32)}
              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              Search Align
            </button>
          </div>
        </div>

        {/* Right Spacing Control */}
        <div>
          <label className="text-gray-300 text-sm block mb-2">
            ➡️ Right margin after "LIKE I SAID": {rightSpacing * 4}px
          </label>
          <input
            type="range"
            min="0"
            max="50"
            value={rightSpacing}
            onChange={(e) => setRightSpacing(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setRightSpacing(5)}
              className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
            >
              Small
            </button>
            <button
              onClick={() => setRightSpacing(12)}
              className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
            >
              Medium
            </button>
            <button
              onClick={() => setRightSpacing(20)}
              className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
            >
              Large
            </button>
            <button
              onClick={() => setRightSpacing(35)}
              className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
            >
              Extra
            </button>
          </div>
        </div>

        {/* Container Padding Controls */}
        <div className="pt-4 border-t border-gray-600">
          <h4 className="text-white text-sm font-medium mb-3">📦 Container Padding</h4>
          
          {/* Container Left Padding */}
          <div className="mb-4">
            <label className="text-gray-300 text-sm block mb-2">
              ⬅️ Container left padding: {containerPaddingLeft}px
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={containerPaddingLeft}
              onChange={(e) => setContainerPaddingLeft(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setContainerPaddingLeft(0)}
                className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
              >
                None
              </button>
              <button
                onClick={() => setContainerPaddingLeft(16)}
                className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
              >
                Default
              </button>
              <button
                onClick={() => setContainerPaddingLeft(32)}
                className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
              >
                Large
              </button>
            </div>
          </div>

          {/* Container Right Padding */}
          <div className="mb-4">
            <label className="text-gray-300 text-sm block mb-2">
              ➡️ Container right padding: {containerPaddingRight}px
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={containerPaddingRight}
              onChange={(e) => setContainerPaddingRight(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setContainerPaddingRight(0)}
                className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
              >
                None
              </button>
              <button
                onClick={() => setContainerPaddingRight(16)}
                className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
              >
                Default
              </button>
              <button
                onClick={() => setContainerPaddingRight(32)}
                className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
              >
                Large
              </button>
            </div>
          </div>
        </div>
        
        {/* Visual Alignment Helper */}
        <div className="pt-2 border-t border-gray-700">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setShowAlignmentGuides(!showAlignmentGuides)}
              className={`flex-1 px-3 py-2 rounded transition-colors text-sm ${
                showAlignmentGuides 
                  ? 'bg-yellow-600 hover:bg-yellow-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
              } text-white`}
            >
              👁️ {showAlignmentGuides ? 'Hide' : 'Show'} Guides
            </button>
            <button
              onClick={() => {
                // Align with Search heading - measure and align precisely
                const searchHeading = document.querySelector('h2:contains("Search")')
                if (searchHeading) {
                  const rect = searchHeading.getBoundingClientRect()
                  const containerRect = document.querySelector('.space-container')?.getBoundingClientRect()
                  if (containerRect) {
                    const alignmentValue = rect.left - containerRect.left
                    setLeftSpacing(Math.max(0, alignmentValue))
                  }
                } else {
                  // Fallback to typical content padding
                  setLeftSpacing(32)
                }
              }}
              className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
            >
              📐 Auto-Align
            </button>
          </div>
          <button
            onClick={() => {
              setLeftSpacing(22)
              setRightSpacing(20)
              setContainerPaddingLeft(0)
              setContainerPaddingRight(0)
              setShowAlignmentGuides(false)
            }}
            className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            🔄 Reset All to Default
          </button>
        </div>
        
        <div className="text-xs text-gray-400">
          <p>💡 Use "Show Guides" to see alignment lines, then "Auto-Align" to match the Search text position.</p>
          <p className="mt-1">Or manually adjust sliders for precise control.</p>
        </div>
      </div>
      
      {/* Alignment Guides - Hidden by default */}
      {showAlignmentGuides && (
        <>
          <div 
            className="alignment-guide fixed top-0 bottom-0 bg-red-500 opacity-50 z-40 pointer-events-none"
            style={{ 
              left: `${Number(leftSpacing) || 0}px`, 
              width: '2px',
              display: showAlignmentGuides ? 'block' : 'none'
            }}
          />
          <div 
            className="alignment-guide fixed top-16 text-red-500 text-xs font-bold z-40 pointer-events-none bg-black px-1 rounded"
            style={{ 
              left: `${(Number(leftSpacing) || 0) + 5}px`,
              display: showAlignmentGuides ? 'block' : 'none'
            }}
          >
            LOGO EDGE
          </div>
        </>
      )}
    </div>
  )
}