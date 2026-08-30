import { useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Leaf,
  LoaderCircle,
  Sparkles,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { getCategoryMeta } from '../utils/wasteCategory'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
).replace(/\/$/, '')

function getAccessToken() {
  return (
    window.localStorage.getItem('wastewise_access_token') ||
    window.sessionStorage.getItem('wastewise_access_token')
  )
}

function WasteClassification({ onNavigate }) {
  const [image, setImage] = useState(null)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('Preparing your image...')
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const analyzeImage = async () => {
      try {
        const storedImage = sessionStorage.getItem('wastewise_uploaded_image')

        if (!storedImage) {
          throw new Error(
            'No waste image was found. Please upload an image again.'
          )
        }

        setImage(storedImage)
        setMessage('Uploading image to WasteWise AI...')

        const response = await fetch(storedImage)
        const blob = await response.blob()
        const file = new File([blob], 'waste-image.jpg', {
          type: 'image/jpeg',
        })

        const formData = new FormData()
        formData.append('image', file)

        setMessage('AI is identifying the waste and generating disposal steps...')

        const accessToken = getAccessToken()
        const apiResponse = await fetch(`${API_BASE_URL}/waste/analyze`, {
          method: 'POST',
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
          body: formData,
        })

        const data = await apiResponse.json()

        if (!apiResponse.ok) {
          throw new Error(data?.detail || 'Waste analysis failed.')
        }

        setMessage('AI analysis completed successfully.')
        setAnalysis(data)
        sessionStorage.setItem('wastewise_analysis', JSON.stringify(data))
        setStatus('success')
      } catch (err) {
        console.error('Waste analysis error:', err)
        setError(err.message || 'Unable to analyze this image.')
        setStatus('error')
      }
    }

    analyzeImage()
  }, [])

  const continueToJourney = () => {
    onNavigate('/waste-journey')
  }

  return (
    <main className="min-h-screen bg-[#f5f8f3] text-slate-900">
      <Navbar activePath="dashboard" onNavigate={onNavigate} />

      <div className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
        <section className="text-center">
          <p className="text-xs font-bold tracking-[0.18em] text-green-700">
            WASTEWISE AI
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            {status === 'success'
              ? 'Waste identified'
              : status === 'error'
                ? 'Analysis failed'
                : 'Analyzing your waste'}
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-slate-500">
            {status === 'success'
              ? 'Here is what our AI detected in your image.'
              : message}
          </p>
        </section>

        {image && (
          <div className="mx-auto mt-8 max-w-md overflow-hidden rounded-3xl border border-green-100 bg-white p-3 shadow-lg">
            <img
              src={image}
              alt="Uploaded waste"
              className="max-h-[380px] w-full rounded-2xl object-cover"
            />
          </div>
        )}

        {status === 'loading' && (
          <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-green-100 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                <LoaderCircle size={32} className="animate-spin" />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {[
                'Image received',
                'Identifying actual waste items',
                'Classifying waste categories',
                'Generating disposal recommendations',
              ].map((text, index) => (
                <div
                  key={text}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"
                >
                  <LoaderCircle
                    size={19}
                    className={`flex-shrink-0 text-green-600 ${
                      index === 0 ? 'animate-spin' : 'opacity-30'
                    }`}
                  />
                  <span className="text-sm font-semibold">{text}</span>
                </div>
              ))}
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              AI analysis may take a few seconds...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertCircle size={32} />
            </div>

            <h2 className="mt-5 text-xl font-bold">
              We couldn't analyze this image
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="mt-6 rounded-xl bg-green-700 px-6 py-3 font-semibold text-white transition hover:bg-green-800"
            >
              Upload Another Image
            </button>
          </div>
        )}

        {status === 'success' && analysis && (
          <div className="mt-8">
            {analysis.ai_summary && (
              <section className="rounded-3xl border border-green-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-[0.15em] text-green-700">
                      AI SUMMARY
                    </p>
                    <p className="mt-2 leading-relaxed text-slate-700">
                      {analysis.ai_summary}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section className="mt-6">
              <div>
                <p className="text-xs font-bold tracking-[0.15em] text-green-700">
                  DETECTED WASTE
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  What AI found in your image
                </h2>
              </div>

              <div className="mt-5 grid gap-4">
                {analysis.categories?.map((category, index) => {
                  const meta = getCategoryMeta(category.category)
                  const Icon = meta.icon
                  const confidence = Math.round(
                    Number(category.confidence || 0) * 100
                  )

                  return (
                    <article
                      key={category.id ?? `${category.category}-${index}`}
                      className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-11 w-11 items-center justify-center rounded-xl ${meta.color}`}
                          >
                            <Icon size={21} />
                          </span>
                          <div>
                            <h3 className="text-lg font-bold">{meta.label}</h3>
                            <p className="text-xs text-slate-500">
                              {confidence}% AI confidence &middot;{' '}
                              {category.items?.length || 0} item
                              {category.items?.length === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>

                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold capitalize text-green-700">
                          {String(category.category).replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {category.items?.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
                          >
                            {item}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 rounded-2xl bg-green-50/70 p-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-green-800">
                          <CheckCircle2 size={18} />
                          Disposal Instructions Prepared
                        </div>
                        <p className="mt-1.5 text-sm text-slate-600">
                          {category.disposal_steps?.[0]?.instruction ||
                            'Complete disposal steps generated.'}
                        </p>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <div className="mt-8 flex justify-center pb-12">
              <button
                type="button"
                onClick={continueToJourney}
                className="rounded-xl bg-green-700 px-8 py-4 font-bold text-white shadow-lg shadow-green-700/20 transition hover:bg-green-800"
              >
                See My Personalized Disposal Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default WasteClassification