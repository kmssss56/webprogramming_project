export default function LoadingSpinner({ size = 36, className = '' }) {
  return (
    <div className={`flex items-center justify-center py-20 ${className}`}>
      <div className="spinner" style={{ width: size, height: size }} />
    </div>
  )
}
