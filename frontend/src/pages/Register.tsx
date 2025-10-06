import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const schema = z.object({ email: z.string().email(), password: z.string().min(6), name: z.string().optional() })
type Form = z.infer<typeof schema>

export default function Register() {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<Form>({ resolver: zodResolver(schema) })
  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Create Your Account</h1>
        <form className="space-y-5" onSubmit={handleSubmit(async (v) => {
          try {
            const res = await api.post('/api/auth/register', v)
            localStorage.setItem('token', res.data.token)
            navigate('/dashboard')
          } catch (e: any) {
            const msg = e?.response?.data?.error || 'Registration failed'
            setError('email', { message: String(msg) })
          }
        })}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
            <input 
              placeholder="John Doe" 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white text-slate-900" 
              {...register('name')} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
            <input 
              placeholder="you@example.com" 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white text-slate-900" 
              {...register('email')} 
            />
            {errors.email && <div className="text-red-600 text-sm mt-1.5">{errors.email.message}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <input 
              type="password" 
              placeholder="At least 6 characters" 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white text-slate-900" 
              {...register('password')} 
            />
            {errors.password && <div className="text-red-600 text-sm mt-1.5">{errors.password.message}</div>}
          </div>
          <button 
            disabled={isSubmitting} 
            className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}