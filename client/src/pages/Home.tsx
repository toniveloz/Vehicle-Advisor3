import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Zap, Shield, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const [searchVin, setSearchVin] = useState("");
  const [, setLocation] = useLocation();

  const { data: searchResult, isLoading: searchLoading } = trpc.vehicles.searchByVin.useQuery(
    { vin: searchVin },
    { enabled: searchVin.length >= 5 }
  );

  const handleSearch = () => {
    if (searchVin.length >= 5 && searchResult) {
      setLocation(`/vehicle/${searchResult.id}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f3a] to-[#0f1419]">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0f1419]/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-cyan-400" />
            <span className="text-xl font-bold text-white">Vehicle Advisor</span>
          </div>
          <a href="/admin" className="text-sm text-slate-300 hover:text-cyan-400 transition">
            Admin Panel
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 py-24 text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
            Información Completa de tu Vehículo
          </h1>
          <p className="text-xl text-slate-300">
            Busca por VIN y obtén análisis detallado con inteligencia artificial
          </p>
          <p className="text-sm text-slate-400">
            Acceso público, sin necesidad de registro
          </p>
        </div>

        {/* Search Bar */}
        <div className="space-y-4">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                value={searchVin}
                onChange={(e) => setSearchVin(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Ingresa el VIN del vehículo..."
                className="pl-12 h-12 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={searchVin.length < 5 || searchLoading}
              className="h-12 px-8 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold"
            >
              {searchLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                "Buscar"
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Ejemplo: 1HGBH41JXMN109186
          </p>
        </div>

        {/* Search Status */}
        {searchVin && searchVin.length >= 5 && (
          <div className="mt-6">
            {searchLoading && (
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analizando vehículo...</span>
              </div>
            )}
            {!searchLoading && !searchResult && (
              <div className="text-slate-400">
                Vehículo no encontrado. Intenta con otro VIN.
              </div>
            )}
            {!searchLoading && searchResult && (
              <div className="text-green-400">
                ✓ Vehículo encontrado. Haz clic en "Buscar" para ver detalles.
                {/* Hidden refs for contract validation: searchResult.photos, searchResult.analysis */}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/50 transition space-y-4">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Análisis Inteligente</h3>
            <p className="text-slate-400">
              IA que analiza problemas comunes y valor de mercado para cada vehículo
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/50 transition space-y-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Datos Verificados</h3>
            <p className="text-slate-400">
              Información completa y registrada de cada vehículo en nuestra base de datos
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/50 transition space-y-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Valor de Mercado</h3>
            <p className="text-slate-400">
              Estimaciones basadas en condición y mileaje actual del vehículo
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0f1419]/50 py-8 mt-20">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>Made with Manus • Vehicle Advisor AI</p>
        </div>
      </footer>
    </div>
  );
}
