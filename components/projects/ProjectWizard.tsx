'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import CropAnalysisCard from './CropAnalysisCard';
import FieldSelector from './FieldSelector';
import ProjectTypeSelector from './ProjectTypeSelector';
import PlantingHistoryInput from './PlantingHistoryInput';

type WizardStep = 'project-type' | 'selection' | 'crop-analysis' | 'planting-history' | 'field-context';

export default function ProjectWizard({ locale }: { locale: string }) {
    const t = useTranslations('projects.create.wizard');
    const router = useRouter();

    const [step, setStep] = useState<WizardStep>('project-type');
    const [cropAnalysis, setCropAnalysis] = useState<any>(null);
    const [selectedField, setSelectedField] = useState<any>(null);
    const [generatedSchedule, setGeneratedSchedule] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // State for new workflow
    const [projectType, setProjectType] = useState<'new' | 'existing' | null>(null);
    const [plantingDate, setPlantingDate] = useState<string | null>(null);

    // Step 0: Project Type Selection (FIRST STEP)
    if (step === 'project-type') {
        return (
            <ProjectTypeSelector onSelect={(type) => {
                setProjectType(type);
                setStep('selection'); // Move to crop selection
            }} />
        );
    }

    // Step 1: Selection (Scan or Manual) - Modified to handle flow
    const handleScanImage = async (file: File) => {
        setLoading(true);
        const reader = new FileReader();

        reader.onloadend = async () => {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
                // 1. First get recommendation/analysis from image
                const res = await fetch(`${baseUrl}/api/v1/agents/recommend`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: reader.result }),
                });

                if (res.ok) {
                    const data = await res.json();

                    // Extract variety if available, otherwise empty string
                    const variety = data.variety || "";
                    const region = "Niigata"; // Default for now, could be dynamic later

                    // 2. Then fetch/research knowledge base for this crop
                    const knowledgeRes = await fetch(`${baseUrl}/api/v1/knowledge/crops?crop=${encodeURIComponent(data.crop)}&variety=${encodeURIComponent(variety)}&region=${encodeURIComponent(region)}`);
                    if (knowledgeRes.ok) {
                        const knowledgeData = await knowledgeRes.json();
                        // Merge knowledge into analysis
                        setCropAnalysis({ ...data, knowledge: knowledgeData.knowledge });
                    } else {
                        setCropAnalysis(data);
                    }

                    setStep('crop-analysis');
                }
            } catch (error) {
                console.error('Scan error:', error);
                alert('Failed to scan image');
            } finally {
                setLoading(false);
            }
        };

        reader.readAsDataURL(file);
    };

    const handleManualCropInput = async (cropName: string) => {
        if (!cropName) return;
        setLoading(true);

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            const variety = ""; // Manual entry doesn't have variety yet
            const region = "Niigata";

            // 1. Fetch/Research Knowledge Base first
            const knowledgeRes = await fetch(`${baseUrl}/api/v1/knowledge/crops?crop=${encodeURIComponent(cropName)}&variety=${encodeURIComponent(variety)}&region=${encodeURIComponent(region)}`);
            let knowledge = null;

            if (knowledgeRes.ok) {
                const kData = await knowledgeRes.json();
                knowledge = kData.knowledge;
            }

            // 2. Get standard recommendation (using knowledge if available to improve result)
            const res = await fetch(`${baseUrl}/api/v1/agents/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ crop: cropName, knowledge }),
            });

            if (res.ok) {
                const data = await res.json();
                setCropAnalysis({ ...data, knowledge });
                setStep('crop-analysis');
            }
        } catch (error) {
            console.error('Analysis error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Crop Analysis Review -> Field Context OR Planting History
    const handleProceedFromAnalysis = () => {
        if (projectType === 'existing') {
            setStep('planting-history');
        } else {
            setStep('field-context');
        }
    };

    // Step 2.5: Planting History (For Existing Projects)
    const handlePlantingHistoryComplete = (data: { plantingDate: string }) => {
        setPlantingDate(data.plantingDate);
        setStep('field-context');
    };

    // Step 3: Field Context -> Create Project (Directly)
    const handleCreateProject = async () => {
        setLoading(true);

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

            const payload = {
                name: `${cropAnalysis.crop} ${new Date().getFullYear()}`,
                crop: cropAnalysis.crop,
                variety: cropAnalysis.variety,
                startDate: plantingDate || new Date().toISOString().split('T')[0],
                fieldId: selectedField?.id,
                notes: cropAnalysis.notes,
                tasks: [],
            };
            console.log('Creating project with payload:', payload);

            // Create project with basic info (no tasks initially)
            const res = await fetch(`${baseUrl}/api/v1/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const { project } = await res.json();
                router.refresh(); // Ensure list is updated
                router.push(`/${locale}/projects/${project.id}`);
            } else {
                throw new Error('Failed to create project');
            }
        } catch (error) {
            console.error('Project creation error:', error);
            alert('プロジェクトの作成に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // Render based on step
    if (step === 'selection') {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setStep('project-type')}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        戻る
                    </button>
                    <h2 className="text-xl font-semibold text-center flex-1">{t('title')}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Scan Option */}
                    <div className="bg-white border-2 border-green-100 rounded-2xl p-8 hover:border-green-500 hover:shadow-lg transition">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl text-green-700">qr_code_scanner</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('scan_seed_bag')}</h3>
                            <p className="text-sm text-gray-500 text-center mb-4">{t('scan_description')}</p>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleScanImage(e.target.files[0])}
                                className="hidden"
                                id="seed-bag-input"
                            />
                            <label
                                htmlFor="seed-bag-input"
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer"
                            >
                                {loading ? '解析中...' : '写真を選択'}
                            </label>
                        </div>
                    </div>

                    {/* Manual Option */}
                    <div className="bg-white border-2 border-gray-100 rounded-2xl p-8 hover:border-gray-400 hover:shadow-lg transition">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl text-gray-600">edit_note</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('manual_entry')}</h3>
                            <p className="text-sm text-gray-500 text-center mb-4">{t('manual_description')}</p>

                            <div className="w-full">
                                <input
                                    type="text"
                                    placeholder="例: コシヒカリ"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleManualCropInput((e.target as HTMLInputElement).value);
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        const input = document.querySelector('input[placeholder="例: コシヒカリ"]') as HTMLInputElement;
                                        handleManualCropInput(input?.value || '');
                                    }}
                                    disabled={loading}
                                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                                >
                                    {loading ? '解析中...' : '次へ'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'crop-analysis') {
        return (
            <div className="space-y-6">
                <CropAnalysisCard analysis={cropAnalysis} />
                <div className="flex justify-end gap-4">
                    <button
                        onClick={() => setStep('selection')}
                        className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                        戻る
                    </button>
                    <button
                        onClick={handleProceedFromAnalysis}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                        {projectType === 'existing' ? '次へ：植付け時期' : '次へ：圃場を選択'}
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'planting-history') {
        return (
            <div className="space-y-6">
                <PlantingHistoryInput
                    crop={cropAnalysis.crop}
                    onComplete={handlePlantingHistoryComplete}
                />
                <div className="flex justify-start">
                    <button
                        onClick={() => setStep('crop-analysis')}
                        className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                        戻る
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'field-context') {
        return (
            <div className="space-y-6">
                <CropAnalysisCard analysis={cropAnalysis} />
                <FieldSelector
                    selectedFieldId={selectedField?.id}
                    onChange={(id) => setSelectedField({ id })}
                />
                <div className="flex justify-end gap-4">
                    <button
                        onClick={() => setStep(projectType === 'existing' ? 'planting-history' : 'crop-analysis')}
                        className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                        戻る
                    </button>
                    <button
                        onClick={handleCreateProject}
                        disabled={loading}
                        className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-bold text-lg"
                    >
                        {loading ? '作成中...' : 'プロジェクトを作成'}
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
