import React from "react"
import "~style.css"

function TestPopup() {
  return (
    <div className="w-96 h-64 bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <span className="text-2xl">🌐</span>
          </div>
          <div>
            <h2 className="text-xl font-bold">Dubinq Translator</h2>
            <p className="text-xs text-white/80">Real-time YouTube translation</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
            <span className="text-3xl">✨</span>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            UI Test
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Modern UI đang hoạt động!
          </p>
          <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105">
            Test Button
          </button>
        </div>
      </div>
    </div>
  )
}

export default TestPopup
