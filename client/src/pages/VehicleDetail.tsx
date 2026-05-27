import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, CheckCircle2, AlertCircle, DollarSign, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { trpc } from "@/lib/trpc";

export default function VehicleDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/vehicle/:id");
  const vehicleId = params?.id ? parseInt(params.id) : null;
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [selectedDamagePhoto, setSelectedDamagePhoto] = useState<string | null>(null);
  const [showDamageModal, setShowDamageModal] = useState(false);

  const { data: bundleData, isLoading } = trpc.vehicles.detail.useQuery(
    { id: vehicleId! },
    { enabled: !!vehicleId }
  );

  const vehicle = bundleData?.vehicle;
  const photos = bundleData?.photos || [];
  const damages = bundleData?.damages || [];
  const parts = bundleData?.parts || [];
  const carfaxSummary = bundleData?.carfaxSummary;
  const analysis = bundleData?.analysis;

  if (!vehicleId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f3a] to-[#0f1419] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">Vehículo no encontrado</p>
          <Button onClick={() => setLocation("/")} className="mt-4 bg-cyan-500 hover:bg-cyan-600">
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f3a] to-[#0f1419] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f3a] to-[#0f1419] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">Vehículo no disponible</p>
          <Button onClick={() => setLocation("/")} className="mt-4 bg-cyan-500 hover:bg-cyan-600">
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  const currentPhoto = photos[currentPhotoIndex]?.photoUrl;

  const askingPrice = parseFloat(vehicle.askingPrice || "0");
  const marketPrice = parseFloat(vehicle.marketPrice || "0");
  const savingsAmount = marketPrice - askingPrice;
  const savingsPercent = marketPrice > 0 ? ((savingsAmount / marketPrice) * 100).toFixed(1) : "0";

  const getRecommendationBadge = () => {
    if (analysis?.recommendation === "strong_buy") return { label: "⭐ COMPRA ALTAMENTE RECOMENDADA", color: "bg-green-500/10 border-green-500/30" };
    if (analysis?.recommendation === "buy") return { label: "✓ COMPRA RECOMENDADA", color: "bg-emerald-500/10 border-emerald-500/30" };
    if (analysis?.recommendation === "caution") return { label: "⚠ REVISAR CON CUIDADO", color: "bg-yellow-500/10 border-yellow-500/30" };
    return { label: "✗ NO RECOMENDADA", color: "bg-red-500/10 border-red-500/30" };
  };

  const badge = getRecommendationBadge();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f3a] to-[#0f1419]">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0f1419]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => setLocation("/")} className="text-slate-400 hover:text-cyan-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-white">
            {vehicle.year} {vehicle.brand} {vehicle.model}
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* HERO SECTION */}
        <section className={`border rounded-xl p-8 ${badge.color}`}>
          <div className="space-y-6">
            {/* Badge */}
            <div className="inline-block px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700">
              <p className="text-lg font-bold text-white">{badge.label}</p>
            </div>

            {/* Información Principal */}
            <div className="space-y-2">
              <h2 className="text-4xl font-bold text-white">
                {vehicle.year} {vehicle.brand} {vehicle.model}
              </h2>
              <div className="flex flex-wrap gap-4 text-slate-300">
                {vehicle.trim && <span>• {vehicle.trim}</span>}
                {vehicle.mileage && <span>• {vehicle.mileage} mi</span>}
                <span>• {vehicle.titleType === "clean" ? "Clean Title" : vehicle.titleType}</span>
              </div>
            </div>

            {/* Comparativa de Precios */}
            <div className="grid md:grid-cols-3 gap-4 pt-6 border-t border-slate-700">
              <div className="space-y-1">
                <p className="text-sm text-slate-400">Valor de Mercado</p>
                <p className="text-2xl font-bold text-white">${marketPrice.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-400">Compra en Subasta</p>
                <p className="text-2xl font-bold text-cyan-400">${askingPrice.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-400">Ahorro Potencial</p>
                <p className="text-2xl font-bold text-green-400">+${savingsAmount.toLocaleString()}</p>
                <p className="text-xs text-green-400">{savingsPercent}% de descuento</p>
              </div>
            </div>
          </div>
        </section>

        {/* GALERÍA PRINCIPAL CON CARRUSEL INTERACTIVO */}
        {photos.length > 0 && (
          <section className="space-y-4">
            <Carousel className="w-full">
              <CarouselContent className="relative">
                {photos.map((photo: any, idx: number) => (
                  <CarouselItem key={idx} className="w-full">
                    <div className="relative w-full aspect-video bg-slate-800 rounded-xl overflow-hidden">
                      <img 
                        src={photo.photoUrl} 
                        alt={`Vehicle ${idx + 1}`} 
                        className="w-full h-full object-cover" 
                      />
                      {/* Contador */}
                      <div className="absolute bottom-4 right-4 bg-slate-900/80 px-3 py-1 rounded-full text-sm text-white">
                        {idx + 1} / {photos.length}
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {photos.length > 1 && (
                <>
                  <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-900 border-0" />
                  <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-900 border-0" />
                </>
              )}
            </Carousel>

            {/* Miniaturas */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photos.map((photo: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPhotoIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                      idx === currentPhotoIndex ? "border-cyan-500" : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <img src={photo.photoUrl} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ⚡ AUCTION INSIGHT ENGINE */}
        {analysis && (
          <section className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Auction Insight Engine</h2>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              {vehicle?.analysisStatus === "completed" && (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-green-400">Análisis Completado</span>
                </>
              )}
              {vehicle?.analysisStatus === "analyzing" && (
                <>
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  <span className="text-cyan-400">Analizando...</span>
                </>
              )}
              {vehicle?.analysisStatus === "failed" && (
                <>
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400">Error en análisis</span>
                </>
              )}
            </div>

            {/* Análisis Visual */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🟢</span>
                <span className="text-slate-300">Historial consistente</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🟢</span>
                <span className="text-slate-300">Valor de mercado favorable</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🟡</span>
                <span className="text-slate-300">Reparación moderada estimada</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🟢</span>
                <span className="text-slate-300">Potencial de reventa positivo</span>
              </div>
            </div>

            {/* Conclusión */}
            {analysis.purchaseJustification && (
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                <p className="text-slate-300 italic">"{analysis.purchaseJustification}"</p>
              </div>
            )}
          </section>
        )}

        {/* 💰 ANÁLISIS FINANCIERO */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-amber-400" />
            Análisis Financiero
          </h2>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-2">
              <p className="text-sm text-slate-400">Valor de Mercado</p>
              <p className="text-2xl font-bold text-white">${marketPrice.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-2">
              <p className="text-sm text-slate-400">Compra en Subasta</p>
              <p className="text-2xl font-bold text-cyan-400">${askingPrice.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-2">
              <p className="text-sm text-slate-400">Ahorro Estimado</p>
              <p className="text-2xl font-bold text-green-400">+${savingsAmount.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-2">
              <p className="text-sm text-slate-400">Rentabilidad</p>
              <p className="text-2xl font-bold text-emerald-400">ALTA</p>
            </div>
          </div>
        </section>

        {/* 📋 RESUMEN CARFAX */}
        {carfaxSummary && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Resumen Carfax</h2>

            <div className="grid md:grid-cols-2 gap-4">
              {carfaxSummary.cleanTitle ? (
                <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-slate-300">Título Limpio</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-slate-300">Título Salvage/Branded</span>
                </div>
              )}

              {carfaxSummary.accidentsCount === 0 ? (
                <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-slate-300">Sin accidentes reportados</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <span className="text-slate-300">{carfaxSummary.accidentsCount} accidente(s) reportado(s)</span>
                </div>
              )}

              {carfaxSummary.serviceHistory ? (
                <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-slate-300">Historial de servicio disponible</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-slate-500/10 border border-slate-500/30 rounded-lg p-4">
                  <AlertCircle className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">Historial de servicio limitado</span>
                </div>
              )}

              {carfaxSummary.odometerIssues ? (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-slate-300">Problemas de odómetro detectados</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-slate-300">Millaje consistente</span>
                </div>
              )}
            </div>

            <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-6">
              Ver Reporte Completo Carfax
            </Button>
          </section>
        )}

        {/* 🔧 DAÑOS DETECTADOS */}
        {damages.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Daños Detectados</h2>

            <div className="grid md:grid-cols-3 gap-4">
              {damages.map((damage: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:border-cyan-500/50 transition"
                  onClick={() => {
                    if (damage.photoUrl) {
                      setSelectedDamagePhoto(damage.photoUrl);
                      setShowDamageModal(true);
                    }
                  }}
                >
                  {damage.photoUrl && (
                    <img src={damage.photoUrl} alt={damage.type} className="w-full h-32 object-cover hover:opacity-80 transition" />
                  )}
                  <div className="p-4">
                    <p className="font-semibold text-white capitalize">{damage.type}</p>
                    {damage.description && <p className="text-sm text-slate-400 mt-2">{damage.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Modal de Foto de Daño a Pantalla Completa */}
        <Dialog open={showDamageModal} onOpenChange={setShowDamageModal}>
          <DialogContent className="max-w-none w-screen h-screen max-h-screen bg-black/98 border-0 p-0 flex items-center justify-center">
            <button
              onClick={() => setShowDamageModal(false)}
              className="absolute top-4 right-4 z-50 bg-slate-900/80 hover:bg-slate-900 p-3 rounded-full transition"
            >
              <X className="w-7 h-7 text-white" />
            </button>
            {selectedDamagePhoto && (
              <img
                src={selectedDamagePhoto}
                alt="Damage"
                className="w-full h-full object-contain"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* 🛠 PIEZAS RECOMENDADAS */}
        {parts.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Piezas Recomendadas</h2>

            <div className="space-y-3">
              {parts.map((part: any, idx: number) => (
                <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{part.name}</p>
                    {part.estimatedCost && (
                      <p className="text-sm text-slate-400">Estimado: ${parseFloat(part.estimatedCost).toLocaleString()}</p>
                    )}
                  </div>
                  {part.link && (
                    <a
                      href={part.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                    >
                      Ver Pieza
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="py-8 border-t border-slate-800 text-center text-slate-400">
          <p>Vehicle Advisor © 2026 - Análisis Premium de Oportunidades de Compra en Subasta</p>
        </div>
      </div>
    </div>
  );
}
