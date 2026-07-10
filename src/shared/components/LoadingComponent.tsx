
export default function LoadingComponent() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#FF5E00] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 text-lg">Cargando lista de productos...</p>
      </div>
    </div>
  )
}
