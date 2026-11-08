export function ExitToast() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center">
      <div className="rounded-full bg-solid px-4 py-2 text-sm font-medium text-on-solid shadow-lg">
        Press back again to exit
      </div>
    </div>
  )
}
