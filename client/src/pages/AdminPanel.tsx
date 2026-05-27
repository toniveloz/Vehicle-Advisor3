import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Upload, X, Plus, Trash2, Edit2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const createMutation = trpc.vehicles.create.useMutation();
  const createWithCarfaxMutation = trpc.vehicles.createWithCarfax.useMutation();
  const attachCarfaxMutation = trpc.vehicles.attachCarfaxAndAnalyze.useMutation();
  const analyzeCarfaxOnlyMutation = trpc.vehicles.analyzeCarfaxOnly.useMutation();
  const deleteMutation = trpc.vehicles.delete.useMutation();
  const updateMutation = trpc.vehicles.update.useMutation();
  const listQuery = trpc.vehicles.listAll.useQuery();
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"add" | "list">("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Información Principal
  const [year, setYear] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [vin, setVin] = useState("");
  const [trim, setTrim] = useState("");
  const [mileage, setMileage] = useState("");

  // Datos Financieros
  const [askingPrice, setAskingPrice] = useState("");
  const [marketPrice, setMarketPrice] = useState("");
  const [titleType, setTitleType] = useState<"clean" | "salvage" | "rebuilt" | "branded">("clean");

  // Evaluación Interna
  const [viabilityScore, setViabilityScore] = useState("");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("low");
  const [resaleScore, setResaleScore] = useState("");

  // Fotos Principales
  const [mainPhotos, setMainPhotos] = useState<string[]>([]);

  // Fotos del Daño
  const [damages, setDamages] = useState<Array<{ type: string; photo: string }>>([]);
  const [damageType, setDamageType] = useState("");
  const [damagePhoto, setDamagePhoto] = useState<string | null>(null);

  // Piezas a Reemplazar
  const [parts, setParts] = useState<Array<{ name: string; link: string; cost: string }>>([]);
  const [partName, setPartName] = useState("");
  const [partLink, setPartLink] = useState("");
  const [partCost, setPartCost] = useState("");

  // Resumen Carfax
  const [carfaxSummary, setCarfaxSummary] = useState({
    cleanTitle: true,
    accidentsCount: 0,
    previousOwners: 0,
    serviceHistory: true,
    airbags: true,
    odometerIssues: false,
    structuralDamage: false,
    floodDamage: false,
    totalLoss: false,
    lemonHistory: false,
  });

  // Evidencia
  const [carfaxPdf, setCarfaxPdf] = useState<File | null>(null);
  const [carfaxPdfBase64, setCarfaxPdfBase64] = useState<string | null>(null);
  const [carfaxAnalysisStatus, setCarfaxAnalysisStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'completed' | 'error'>('idle');
  const [carfaxAnalysisError, setCarfaxAnalysisError] = useState<string | null>(null);

  // Notas
  const [notes, setNotes] = useState("");

  // Autenticación removida - contenido público

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "main" | "damage" | "pdf") => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (type === "main") {
          if (mainPhotos.length < 5) {
            setMainPhotos([...mainPhotos, base64]);
          }
        } else if (type === "damage") {
          setDamagePhoto(base64);
        } else if (type === "pdf") {
          setCarfaxPdf(file);
          setCarfaxPdfBase64(base64);
          setCarfaxAnalysisStatus('idle');
          setCarfaxAnalysisError(null);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddDamage = () => {
    if (damageType && damagePhoto) {
      setDamages([...damages, { type: damageType, photo: damagePhoto }]);
      setDamageType("");
      setDamagePhoto(null);
    }
  };

  const handleAddPart = () => {
    if (partName && partLink) {
      setParts([...parts, { name: partName, link: partLink, cost: partCost }]);
      setPartName("");
      setPartLink("");
      setPartCost("");
    }
  };

  const handleOpenEditModal = (vehicleId: number) => {
    const vehicle = listQuery.data?.find(v => v.id === vehicleId);
    if (vehicle) {
      setYear(vehicle.year.toString());
      setBrand(vehicle.brand);
      setModel(vehicle.model);
      setVin(vehicle.vin);
      setTrim(vehicle.trim || "");
      setMileage(vehicle.mileage?.toString() || "");
      setAskingPrice(vehicle.askingPrice?.toString() || "");
      setMarketPrice(vehicle.marketPrice?.toString() || "");
      setTitleType(vehicle.titleType as any);
      setViabilityScore(vehicle.viabilityScore?.toString() || "");
      setRiskLevel(vehicle.riskLevel as any);
      setResaleScore(vehicle.resaleScore?.toString() || "");
      setNotes(vehicle.notes || "");
      // Cargar fotos
      if (vehicle.photos && vehicle.photos.length > 0) {
        setMainPhotos(vehicle.photos.map(p => p.photoUrl));
      } else {
        setMainPhotos([]);
      }
      setEditingId(vehicleId);
      setShowEditModal(true);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingId(null);
    // Reset form
    setYear("");
    setBrand("");
    setModel("");
    setVin("");
    setTrim("");
    setMileage("");
    setAskingPrice("");
    setMarketPrice("");
    setTitleType("clean");
    setViabilityScore("");
    setRiskLevel("low");
    setResaleScore("");
    setNotes("");
    setMainPhotos([]);
    setDamages([]);
    setParts([]);
  };

  const handleSubmit = async () => {
    if (!year || !brand || !model || !vin || !askingPrice || !marketPrice) {
      alert("Por favor completa los campos obligatorios");
      return;
    }

    setIsLoading(true);
    try {
      if (editingId) {
        // Update
        await updateMutation.mutateAsync({
          id: editingId,
          data: {
            year,
            brand,
            model,
            vin,
            trim: trim || undefined,
            mileage: mileage || undefined,
            askingPrice,
            marketPrice,
            titleType,
            viabilityScore: viabilityScore ? parseInt(viabilityScore) : undefined,
            riskLevel,
            resaleScore: resaleScore ? parseInt(resaleScore) : undefined,
            notes: notes || undefined,
            photosBase64: mainPhotos,
            damages: damages.map(d => ({ type: d.type, photoBase64: d.photo, description: undefined })),
            parts: parts.map(p => ({ name: p.name, link: p.link, estimatedCost: p.cost })),
          },
        });
        alert("Vehículo actualizado exitosamente");
        handleCloseEditModal();
      } else {
        // Create
        let createdVehicle;
        
        // Si hay PDF Carfax, crear vehículo con PDF y disparar análisis automático
        if (carfaxPdf && carfaxPdfBase64) {
          setCarfaxAnalysisStatus('uploading');
          const pdfData = carfaxPdfBase64.split(',')[1] || carfaxPdfBase64;
          
          createdVehicle = await createWithCarfaxMutation.mutateAsync({
            vehicle: {
              year,
              brand,
              model,
              vin,
              trim: trim || undefined,
              mileage: mileage || undefined,
              askingPrice,
              marketPrice,
              titleType,
              viabilityScore: viabilityScore ? parseInt(viabilityScore) : undefined,
              riskLevel,
              resaleScore: resaleScore ? parseInt(resaleScore) : undefined,
              photosBase64: mainPhotos,
              damages: damages.map(d => ({ type: d.type, photoBase64: d.photo, description: undefined })),
              parts: parts.map(p => ({ name: p.name, link: p.link, estimatedCost: p.cost })),
              carfaxSummary,
              notes: notes || undefined,
            },
            pdf: {
              fileName: carfaxPdf.name,
              mimeType: 'application/pdf',
              data: pdfData,
            },
          });
          
          // Disparar análisis automático en background
          setCarfaxAnalysisStatus('analyzing');
          try {
            await attachCarfaxMutation.mutateAsync({
              vehicleId: createdVehicle.vehicle.id,
              pdf: {
                fileName: carfaxPdf.name,
                mimeType: 'application/pdf',
                data: pdfData,
              },
            });
            setCarfaxAnalysisStatus('completed');
          } catch (analysisError) {
            console.error("Error en análisis Carfax:", analysisError);
            setCarfaxAnalysisStatus('error');
            setCarfaxAnalysisError(analysisError instanceof Error ? analysisError.message : 'Error desconocido');
          }
        } else {
          // Sin PDF, crear vehículo normal
          createdVehicle = await createMutation.mutateAsync({
            year,
            brand,
            model,
            vin,
            trim: trim || undefined,
            mileage: mileage || undefined,
            askingPrice,
            marketPrice,
            titleType,
            viabilityScore: viabilityScore ? parseInt(viabilityScore) : undefined,
            riskLevel,
            resaleScore: resaleScore ? parseInt(resaleScore) : undefined,
            photosBase64: mainPhotos,
            damages: damages.map(d => ({ type: d.type, photoBase64: d.photo, description: undefined })),
            parts: parts.map(p => ({ name: p.name, link: p.link, estimatedCost: p.cost })),
            carfaxSummary,
            notes: notes || undefined,
          });
        }

        // Reset form
        setYear("");
        setBrand("");
        setModel("");
        setVin("");
        setTrim("");
        setMileage("");
        setAskingPrice("");
        setMarketPrice("");
        setTitleType("clean");
        setViabilityScore("");
        setRiskLevel("low");
        setResaleScore("");
        setMainPhotos([]);
        setDamages([]);
        setDamageType("");
        setDamagePhoto(null);
        setParts([]);
        setPartName("");
        setPartLink("");
        setPartCost("");
        setCarfaxPdf(null);
        setCarfaxPdfBase64(null);
        setCarfaxAnalysisStatus('idle');
        setCarfaxAnalysisError(null);
        setNotes("");
        setActiveTab("list");
        
        const message = carfaxAnalysisStatus === 'completed' 
          ? "Vehículo creado exitosamente - Análisis Carfax completado" 
          : "Vehículo creado exitosamente";
        alert(message);
      }
      
      listQuery.refetch();
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar el vehículo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeCarfax = async () => {
    if (!carfaxPdf || !carfaxPdfBase64) {
      setCarfaxAnalysisError("Por favor carga un PDF primero");
      return;
    }

    setCarfaxAnalysisStatus('analyzing');
    setCarfaxAnalysisError(null);

    try {
      const pdfData = carfaxPdfBase64.split(',')[1] || carfaxPdfBase64;
      
      // Llamar a la mutación de análisis Carfax
      const result = await analyzeCarfaxOnlyMutation.mutateAsync({
        pdf: {
          fileName: carfaxPdf.name,
          mimeType: 'application/pdf',
          data: pdfData,
        },
      });

      // Rellenar automáticamente el campo de notas con el análisis
      if (result.analysis) {
        const summary = `
**Análisis Carfax Automático:**

Factores de Riesgo: ${result.analysis.riskFactors?.join(', ') || 'Ninguno'}
Historial de Accidentes: ${result.analysis.accidentHistory || 'No disponible'}
Número de Dueños: ${result.analysis.numberOfOwners || 'No disponible'}
Puntuación de Viabilidad: ${result.analysis.viabilityScore || 'No disponible'}
        `.trim();
        setNotes(summary);
      }

      setCarfaxAnalysisStatus('completed');
      alert("Análisis completado. El resumen ha sido agregado a las notas.");
    } catch (error) {
      console.error("Error en análisis Carfax:", error);
      setCarfaxAnalysisStatus('error');
      setCarfaxAnalysisError(error instanceof Error ? error.message : 'Error desconocido');
      alert("Error durante el análisis: " + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este vehículo?")) return;
    
    try {
      await deleteMutation.mutateAsync({ id });
      alert("Vehículo eliminado exitosamente");
      listQuery.refetch();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      alert("Error al eliminar el vehículo");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f3a] to-[#0f1419] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-white">Panel de Administración</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <Button
            onClick={() => setActiveTab("list")}
            className={activeTab === "list" ? "bg-cyan-500 hover:bg-cyan-600" : "bg-slate-700 hover:bg-slate-600"}
          >
            Lista de Vehículos
          </Button>
          <Button
            onClick={() => setActiveTab("add")}
            className={activeTab === "add" ? "bg-cyan-500 hover:bg-cyan-600" : "bg-slate-700 hover:bg-slate-600"}
          >
            Agregar Nuevo
          </Button>
        </div>

        {/* Lista de Vehículos */}
        {activeTab === "list" && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Todos los Vehículos</h2>
            {listQuery.isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
              </div>
            ) : listQuery.data && listQuery.data.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listQuery.data.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-cyan-500 transition-colors"
                  >
                    {/* Foto */}
                    {vehicle.photos && vehicle.photos.length > 0 ? (
                      <img
                        src={vehicle.photos[0].photoUrl}
                        alt={`${vehicle.year} ${vehicle.brand} ${vehicle.model}`}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-slate-700 flex items-center justify-center">
                        <span className="text-slate-400">Sin foto</span>
                      </div>
                    )}

                    {/* Contenido */}
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-white mb-2">
                        {vehicle.year} {vehicle.brand} {vehicle.model}
                      </h3>
                      <div className="space-y-2 mb-4 text-sm text-slate-300">
                        <p>VIN: {vehicle.vin}</p>
                        <p>Precio: ${vehicle.askingPrice}</p>
                        <p>Mercado: ${vehicle.marketPrice}</p>
                        {vehicle.mileage && <p>Millaje: {vehicle.mileage.toLocaleString()} mi</p>}
                      </div>

                      {/* Acciones */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleOpenEditModal(vehicle.id)}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleDelete(vehicle.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Borrar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400 mb-4">No hay vehículos registrados</p>
                <Button
                  onClick={() => setActiveTab("add")}
                  className="bg-cyan-500 hover:bg-cyan-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primer Vehículo
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Formulario Agregar */}
        {activeTab === "add" && (
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-8">Registrar Nuevo Vehículo</h2>

            {/* Información Principal */}
            <div className="mb-8 pb-8 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">🚘 Información Principal</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Año"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Input
                  placeholder="Marca"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Input
                  placeholder="Modelo"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Input
                  placeholder="VIN"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Input
                  placeholder="Trim (opcional)"
                  value={trim}
                  onChange={(e) => setTrim(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Input
                  placeholder="Millaje (opcional)"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Datos Financieros */}
            <div className="mb-8 pb-8 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">💰 Datos Financieros</h3>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  placeholder="Precio Compra"
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Input
                  placeholder="Valor Mercado"
                  value={marketPrice}
                  onChange={(e) => setMarketPrice(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <select
                  value={titleType}
                  onChange={(e) => setTitleType(e.target.value as any)}
                  className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                >
                  <option value="clean">Clean Title</option>
                  <option value="salvage">Salvage</option>
                  <option value="rebuilt">Rebuilt</option>
                  <option value="branded">Branded</option>
                </select>
              </div>
            </div>

            {/* Evaluación Interna */}
            <div className="mb-8 pb-8 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">⭐ Evaluación Interna</h3>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  placeholder="Score Viabilidad (0-100)"
                  value={viabilityScore}
                  onChange={(e) => setViabilityScore(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as any)}
                  className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                >
                  <option value="low">Riesgo Bajo</option>
                  <option value="medium">Riesgo Medio</option>
                  <option value="high">Riesgo Alto</option>
                </select>
                <Input
                  placeholder="Score Reventa (0-100)"
                  value={resaleScore}
                  onChange={(e) => setResaleScore(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Fotos Principales */}
            <div className="mb-8 pb-8 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">📸 Fotos Principales</h3>
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-cyan-500 transition-colors mb-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, "main")}
                  className="hidden"
                  id="main-photos"
                />
                <label htmlFor="main-photos" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-300">Haz clic para agregar fotos (máx 5)</p>
                </label>
              </div>
              {mainPhotos.length > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {mainPhotos.map((photo, idx) => (
                    <div key={idx} className="relative">
                      <img src={photo} alt={`Photo ${idx}`} className="w-full h-20 object-cover rounded" />
                      <button
                        onClick={() => setMainPhotos(mainPhotos.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fotos del Daño */}
            <div className="mb-8 pb-8 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">🔧 Fotos del Daño</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <select
                  value={damageType}
                  onChange={(e) => setDamageType(e.target.value)}
                  className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                >
                  <option value="">Selecciona tipo de daño</option>
                  <option value="bumper">Bumper</option>
                  <option value="door">Puerta</option>
                  <option value="fender">Guardafango</option>
                  <option value="suspension">Suspensión</option>
                  <option value="airbags">Airbags</option>
                  <option value="other">Otro</option>
                </select>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-cyan-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, "damage")}
                    className="hidden"
                    id="damage-photo"
                  />
                  <label htmlFor="damage-photo" className="cursor-pointer">
                    <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    <p className="text-sm text-slate-300">Foto del daño</p>
                  </label>
                </div>
              </div>
              {damagePhoto && (
                <div className="mb-4">
                  <img src={damagePhoto} alt="Damage" className="w-20 h-20 object-cover rounded" />
                </div>
              )}
              <Button
                onClick={handleAddDamage}
                disabled={!damageType || !damagePhoto}
                className="bg-emerald-600 hover:bg-emerald-700 w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Daño
              </Button>
              {damages.length > 0 && (
                <div className="mt-4 space-y-2">
                  {damages.map((damage, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-700 p-2 rounded">
                      <span className="text-slate-300">{damage.type}</span>
                      <button
                        onClick={() => setDamages(damages.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Piezas a Reemplazar */}
            <div className="mb-8 pb-8 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">🛠 Piezas a Reemplazar</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Input
                  placeholder="Nombre de la pieza"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Input
                  placeholder="Link de reemplazo"
                  value={partLink}
                  onChange={(e) => setPartLink(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Input
                  placeholder="Precio estimado (opcional)"
                  value={partCost}
                  onChange={(e) => setPartCost(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Button
                onClick={handleAddPart}
                disabled={!partName || !partLink}
                className="bg-emerald-600 hover:bg-emerald-700 w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Pieza
              </Button>
              {parts.length > 0 && (
                <div className="mt-4 space-y-2">
                  {parts.map((part, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-700 p-3 rounded">
                      <div>
                        <p className="text-slate-300 font-semibold">{part.name}</p>
                        <p className="text-sm text-slate-400">{part.link}</p>
                        {part.cost && <p className="text-sm text-cyan-400">${part.cost}</p>}
                      </div>
                      <button
                        onClick={() => setParts(parts.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen Carfax */}
            <div className="mb-8 pb-8 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">📋 Resumen Carfax</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={carfaxSummary.cleanTitle}
                    onChange={(e) => setCarfaxSummary({ ...carfaxSummary, cleanTitle: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Título Limpio
                </label>
                <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={carfaxSummary.serviceHistory}
                    onChange={(e) => setCarfaxSummary({ ...carfaxSummary, serviceHistory: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Historial de Servicio
                </label>
                <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={carfaxSummary.airbags}
                    onChange={(e) => setCarfaxSummary({ ...carfaxSummary, airbags: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Airbags Funcionales
                </label>
                <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={carfaxSummary.odometerIssues}
                    onChange={(e) => setCarfaxSummary({ ...carfaxSummary, odometerIssues: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Problemas de Odómetro
                </label>
                <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={carfaxSummary.structuralDamage}
                    onChange={(e) => setCarfaxSummary({ ...carfaxSummary, structuralDamage: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Daño Estructural
                </label>
                <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={carfaxSummary.floodDamage}
                    onChange={(e) => setCarfaxSummary({ ...carfaxSummary, floodDamage: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Daño por Inundación
                </label>
                <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={carfaxSummary.totalLoss}
                    onChange={(e) => setCarfaxSummary({ ...carfaxSummary, totalLoss: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Pérdida Total
                </label>
                <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={carfaxSummary.lemonHistory}
                    onChange={(e) => setCarfaxSummary({ ...carfaxSummary, lemonHistory: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Historial Lemon
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Número de Accidentes"
                    type="number"
                    value={carfaxSummary.accidentsCount}
                    onChange={(e) => setCarfaxSummary({ ...carfaxSummary, accidentsCount: parseInt(e.target.value) || 0 })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <Input
                    placeholder="Dueños Anteriores"
                    type="number"
                    value={carfaxSummary.previousOwners}
                    onChange={(e) => setCarfaxSummary({ ...carfaxSummary, previousOwners: parseInt(e.target.value) || 0 })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Evidencia */}
            <div className="mb-8 pb-8 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">📂 Evidencia</h3>
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-cyan-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileSelect(e, "pdf")}
                  className="hidden"
                  id="carfax-pdf"
                />
                <label htmlFor="carfax-pdf" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-300">PDF del Reporte Carfax</p>
                </label>
              </div>
              {carfaxPdf && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-green-400">✓ {carfaxPdf.name}</p>
                  <Button
                    onClick={handleAnalyzeCarfax}
                    disabled={!carfaxPdf || carfaxAnalysisStatus === 'analyzing' || carfaxAnalysisStatus === 'uploading'}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    {carfaxAnalysisStatus === 'analyzing' || carfaxAnalysisStatus === 'uploading' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analizando...
                      </>
                    ) : carfaxAnalysisStatus === 'completed' ? (
                      <>
                        <span className="mr-2">✓</span>
                        Análisis Completado
                      </>
                    ) : (
                      <>
                        <span className="mr-2">🤖</span>
                        Analizar con IA
                      </>
                    )}
                  </Button>
                  {carfaxAnalysisError && (
                    <p className="text-sm text-red-400 mt-2">Error: {carfaxAnalysisError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Notas */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">⚡ Insights IA / Notas Adicionales</h3>
              <textarea
                placeholder="Notas o insights adicionales"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 h-24"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-4">
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600"
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Crear Vehículo
              </Button>
              <Button
                onClick={() => setActiveTab("list")}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Editar Vehículo</h2>
                <button
                  onClick={handleCloseEditModal}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Información Principal */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-cyan-400 mb-4">🚘 Información Principal</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Año"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <Input
                    placeholder="Marca"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <Input
                    placeholder="Modelo"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <Input
                    placeholder="VIN"
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    disabled
                  />
                  <Input
                    placeholder="Trim (opcional)"
                    value={trim}
                    onChange={(e) => setTrim(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <Input
                    placeholder="Millaje (opcional)"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              {/* Datos Financieros */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-cyan-400 mb-4">💰 Datos Financieros</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    placeholder="Precio Compra"
                    value={askingPrice}
                    onChange={(e) => setAskingPrice(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <Input
                    placeholder="Valor Mercado"
                    value={marketPrice}
                    onChange={(e) => setMarketPrice(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <select
                    value={titleType}
                    onChange={(e) => setTitleType(e.target.value as any)}
                    className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                  >
                    <option value="clean">Clean Title</option>
                    <option value="salvage">Salvage</option>
                    <option value="rebuilt">Rebuilt</option>
                    <option value="branded">Branded</option>
                  </select>
                </div>
              </div>

              {/* Evaluación Interna */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-cyan-400 mb-4">⭐ Evaluación Interna</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    placeholder="Score Viabilidad (0-100)"
                    value={viabilityScore}
                    onChange={(e) => setViabilityScore(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value as any)}
                    className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                  >
                    <option value="low">Riesgo Bajo</option>
                    <option value="medium">Riesgo Medio</option>
                    <option value="high">Riesgo Alto</option>
                  </select>
                  <Input
                    placeholder="Score Reventa (0-100)"
                    value={resaleScore}
                    onChange={(e) => setResaleScore(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              {/* Fotos Principales */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-cyan-400 mb-4">📸 Fotos Principales (máx 5)</h3>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {mainPhotos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-24 object-cover rounded border border-slate-600" />
                      <button
                        onClick={() => setMainPhotos(mainPhotos.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 p-1 rounded opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                  {mainPhotos.length < 5 && (
                    <label className="border-2 border-dashed border-slate-600 rounded flex items-center justify-center cursor-pointer hover:border-cyan-400 transition h-24">
                      <Plus className="w-6 h-6 text-slate-400" />
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e, "main")}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Fotos de Daño */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-cyan-400 mb-4">🔴 Fotos de Daño</h3>
                <div className="space-y-4">
                  {damages.map((damage, idx) => (
                    <div key={idx} className="flex gap-4 items-start p-4 bg-slate-700 rounded border border-slate-600">
                      <div className="flex-1">
                        <Input
                          placeholder="Tipo de daño"
                          value={damage.type}
                          onChange={(e) => {
                            const newDamages = [...damages];
                            newDamages[idx].type = e.target.value;
                            setDamages(newDamages);
                          }}
                          className="bg-slate-600 border-slate-500 text-white mb-2"
                        />
                        {damage.photo && (
                          <img src={damage.photo} alt="Daño" className="w-full h-32 object-cover rounded border border-slate-600" />
                        )}
                      </div>
                      <div className="flex gap-2 flex-col">
                        <label className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded cursor-pointer transition text-sm">
                          Cambiar
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const newDamages = [...damages];
                                  newDamages[idx].photo = event.target?.result as string;
                                  setDamages(newDamages);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => setDamages(damages.filter((_, i) => i !== idx))}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded transition text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                  <label className="border-2 border-dashed border-slate-600 rounded flex items-center justify-center cursor-pointer hover:border-cyan-400 transition p-4">
                    <div className="text-center">
                      <Plus className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                      <span className="text-slate-400 text-sm">Agregar foto de daño</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setDamages([...damages, { type: "", photo: event.target?.result as string }]);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Notas */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-cyan-400 mb-4">📝 Notas</h3>
                <textarea
                  placeholder="Notas adicionales"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 h-24"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-4">
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Guardar Cambios"}
                </Button>
                <Button
                  onClick={handleCloseEditModal}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
