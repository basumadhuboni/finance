import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const schema = z.object({ email: z.string().email(), password: z.string().min(6) })
type Form = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<Form>({ resolver: zodResolver(schema) })
  return (
    <form className="max-w-sm mx-auto bg-white border rounded p-4 space-y-3" onSubmit={handleSubmit(async (v) => {
      try {
        const res = await api.post('/api/auth/login', v)
        localStorage.setItem('token', res.data.token)
        navigate('/dashboard')
      } catch {
        setError('password', { message: 'Invalid email or password' })
      }
    })}>
      <h1 className="text-lg font-semibold">Login</h1>
      <div>
        <input placeholder="Email" className="border w-full px-2 py-1" {...register('email')} />
        {errors.email && <div className="text-red-600 text-sm">{errors.email.message}</div>}
      </div>
      <div>
        <input type="password" placeholder="Password" className="border w-full px-2 py-1" {...register('password')} />
        {errors.password && <div className="text-red-600 text-sm">{errors.password.message}</div>}
      </div>
      <button disabled={isSubmitting} className="border px-3 py-1">Login</button>
    </form>
  )
}


