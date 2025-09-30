// Language Selector Component

import React, { useEffect, useState } from "react"

import type { LanguageCode } from "../types"
import { LANGUAGE_CODES } from "../types"
import { storageManager } from "../utils/storage"

interface LanguageSelectorProps {
  value: LanguageCode
  onChange: (language: LanguageCode) => void
  label: string
  showRecent?: boolean
  disabled?: boolean
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  label,
  showRecent = false,
  disabled = false
}) => {
  const [recentLanguages, setRecentLanguages] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (showRecent) {
      loadRecentLanguages()
    }
  }, [showRecent])

  const loadRecentLanguages = async () => {
    const recent = await storageManager.getRecentLanguages()
    setRecentLanguages(recent)
  }

  const handleLanguageSelect = async (languageCode: LanguageCode) => {
    onChange(languageCode)
    setIsOpen(false)

    if (showRecent) {
      await storageManager.addRecentLanguage(languageCode)
      await loadRecentLanguages()
    }
  }

  const getLanguageEntries = () => {
    return Object.entries(LANGUAGE_CODES) as [LanguageCode, string][]
  }

  const getRecentLanguageEntries = () => {
    return recentLanguages
      .filter((lang) => lang in LANGUAGE_CODES)
      .map(
        (lang) =>
          [lang, LANGUAGE_CODES[lang as LanguageCode]] as [LanguageCode, string]
      )
  }

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-700 mb-2">
        {label}
      </label>

      <div className="relative">
        <button
          type="button"
          className={`
            w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-left transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
            ${disabled ? "bg-gray-100 cursor-not-allowed opacity-50" : "cursor-pointer hover:border-gray-400"}
          `}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}>
          <span className="flex items-center">
            <span className="text-sm mr-3">{getLanguageFlag(value)}</span>
            <span className="text-sm text-gray-900">
              {LANGUAGE_CODES[value]}
            </span>
          </span>

          <span className="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-20 mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-auto">
            {showRecent && recentLanguages.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-50 border-b border-gray-200">
                  Gần đây
                </div>
                {getRecentLanguageEntries().map(([code, name]) => (
                  <LanguageOption
                    key={`recent-${code}`}
                    code={code}
                    name={name}
                    isSelected={code === value}
                    onClick={() => handleLanguageSelect(code)}
                  />
                ))}
                <div className="border-t border-gray-200 my-1" />
              </>
            )}

            <div className="px-4 py-3 text-xs font-bold text-gray-600 bg-gradient-to-r from-gray-50/50 to-blue-50/30 border-b border-gray-100/50">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 bg-gradient-to-r from-gray-400 to-blue-400 rounded-full"></span>
                <span>Tất cả ngôn ngữ</span>
              </div>
            </div>
            {getLanguageEntries().map(([code, name]) => (
              <LanguageOption
                key={code}
                code={code}
                name={name}
                isSelected={code === value}
                onClick={() => handleLanguageSelect(code)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface LanguageOptionProps {
  code: LanguageCode
  name: string
  isSelected: boolean
  onClick: () => void
}

const LanguageOption: React.FC<LanguageOptionProps> = ({
  code,
  name,
  isSelected,
  onClick
}) => (
  <button
    type="button"
    className={`
      w-full px-4 py-2.5 text-left text-sm transition-colors duration-200 hover:bg-gray-50 focus:outline-none focus:bg-gray-50
      ${isSelected ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-900"}
    `}
    onClick={onClick}>
    <span className="flex items-center">
      <span className="text-sm mr-3">{getLanguageFlag(code)}</span>
      <span className="flex-1">{name}</span>
      {isSelected && (
        <span className="ml-auto">
          <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center">
            <svg
              className="h-2.5 w-2.5 text-white"
              fill="currentColor"
              viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </span>
      )}
    </span>
  </button>
)

// Helper function để lấy flag emoji cho ngôn ngữ
function getLanguageFlag(languageCode: LanguageCode): string {
  const flags: Record<LanguageCode, string> = {
    auto: "🔍",
    vi: "🇻🇳",
    en: "🇺🇸",
    ja: "🇯🇵",
    ko: "🇰🇷",
    zh: "🇨🇳",
    th: "🇹🇭",
    fr: "🇫🇷",
    de: "🇩🇪",
    es: "🇪🇸",
    ru: "🇷🇺",
    ar: "🇸🇦",
    hi: "🇮🇳"
  }

  return flags[languageCode] || "🌐"
}
