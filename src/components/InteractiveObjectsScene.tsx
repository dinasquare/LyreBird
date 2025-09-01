'use client';

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { Check, X } from 'lucide-react';

// Define 3D objects for learning with multiple choice options and model paths
const objects = [
  { 
    id: 'apple',  
    name: 'Apple',
    position: [0, -1, 0], 
    color: '#ff4444', 
    modelPath: '/models/apple.glb',
    scale: 20, // Increased for better visibility
    options: ['manzana', 'pera', 'naranja', 'plátano'],
    correctAnswer: 'manzana'
  },
  { 
    id: 'car',  
    name: 'Toy Car',
    position: [0, -0.2, 0], 
    color: '#4444ff', 
    modelPath: '/models/toy_car.glb',
    scale: 1,
    options: ['coche', 'bicicleta', 'avión', 'barco'],
    correctAnswer: 'coche'
  },
  { 
    id: 'house', 
    name: 'House',
    position: [0, 0, 0], 
    color: '#44ff44', 
    modelPath: '/models/house.glb',
    scale: 1.2,
    options: ['casa', 'edificio', 'castillo', 'cabaña'],
    correctAnswer: 'casa'
  },
  { 
    id: 'coffee',  
    name: 'Coffee',
    position: [0, 0, 0.5], 
    color: '#8B4513', 
    modelPath: '/models/coffee.glb',
    scale: 18,
    options: ['café', 'té', 'leche', 'agua'],
    correctAnswer: 'café'
  },
  { 
    id: 'shirt', 
    name: 'Shirt',
    position: [0, -5, 0], 
    color: '#ff44ff', 
    modelPath: '/models/shirt.glb',
    scale: 4, // Further increased for visibility
    options: ['camisa', 'pantalón', 'vestido', 'zapatos'],
    correctAnswer: 'camisa'
  }
];

// ErrorBoundary for 3D model loading
class ModelErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div className="bg-red-100 text-red-700 p-4 rounded-lg shadow-lg">
            Failed to load 3D model.
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

// Interactive object component with GLB model loading using Suspense
const InteractiveObject = ({ 
  object, 
  isActive,
  onObjectClick, 
  isSelected 
}: { 
  object: any; 
  isActive: boolean;
  onObjectClick: (obj: any) => void;
  isSelected: boolean;
}) => {
  const meshRef = useRef<THREE.Group>(null);
  // Load the GLB model
  const gltf = useLoader(GLTFLoader, object.modelPath) as any;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (isActive) {
      meshRef.current.position.y = object.position[1] + Math.sin(clock.elapsedTime + object.position[0]) * 0.1;
      meshRef.current.rotation.y = clock.elapsedTime * 0.5;
      meshRef.current.scale.lerp(new THREE.Vector3(object.scale, object.scale, object.scale), 0.1);
    } else {
      meshRef.current.scale.lerp(new THREE.Vector3(0.3, 0.3, 0.3), 0.1);
      meshRef.current.rotation.y = 0;
    }
  });

  return (
    <group>
      <primitive
        ref={meshRef}
        object={gltf.scene}
        position={object.position}
        scale={[object.scale, object.scale, object.scale]}
        onClick={() => isActive && onObjectClick(object)}
      />
      {isActive && (
        <Text
          position={[object.position[0], object.position[1] + 1.5 * object.scale, object.position[2]]}
          fontSize={0.3 * object.scale}
          color="#333333"
          anchorX="center"
          anchorY="middle"
        >
          {object.name}
        </Text>
      )}
    </group>
  );
};

// Multiple Choice Question Component
const MultipleChoiceQuestion = ({ 
  object, 
  onAnswer, 
  selectedLanguage 
}: { 
  object: any; 
  onAnswer: (isCorrect: boolean) => void;
  selectedLanguage: string;
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleAnswerClick = (answer: string) => {
    setSelectedAnswer(answer);
    setShowResult(true);
    
    setTimeout(() => {
      onAnswer(answer === object.correctAnswer);
    }, 1000);
  };

  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="bg-white rounded-xl p-8 shadow-2xl max-w-md w-full mx-4">
        <h3 className="text-2xl font-bold text-center mb-6">
          What is this object in {selectedLanguage === 'es' ? 'Spanish' : 'your language'}?
        </h3>
        
        <div className="space-y-3">
          {object.options.map((option: string, index: number) => (
            <button
              key={index}
              onClick={() => handleAnswerClick(option)}
              disabled={showResult}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                selectedAnswer === option
                  ? option === object.correctAnswer
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${showResult ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">{option}</span>
                {showResult && selectedAnswer === option && (
                  option === object.correctAnswer ? (
                    <Check className="w-6 h-6 text-green-500" />
                  ) : (
                    <X className="w-6 h-6 text-red-500" />
                  )
                )}
                {showResult && option === object.correctAnswer && selectedAnswer !== option && (
                  <Check className="w-6 h-6 text-green-500" />
                )}
              </div>
            </button>
          ))}
        </div>
        
        {showResult && (
          <div className={`mt-4 p-3 rounded-lg text-center ${
            selectedAnswer === object.correctAnswer 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {selectedAnswer === object.correctAnswer 
              ? 'Correct! Well done!' 
              : `Incorrect. The correct answer is "${object.correctAnswer}"`
            }
          </div>
        )}
      </div>
    </div>
  );
};

// Learning Result Component
const LearningResult = ({ 
  object, 
  selectedLanguage, 
  onNext 
}: { 
  object: any; 
  selectedLanguage: string;
  onNext: () => void;
}) => {
  const getTranslation = (objectId: string) => {
    const translations: { [key: string]: { [key: string]: string } } = {
      apple: { es: 'manzana', fr: 'pomme', de: 'apfel', it: 'mela', pt: 'maçã' },
      car: { es: 'coche', fr: 'voiture', de: 'auto', it: 'macchina', pt: 'carro' },
      house: { es: 'casa', fr: 'maison', de: 'haus', it: 'casa', pt: 'casa' },
      coffee: { es: 'café', fr: 'café', de: 'kaffee', it: 'caffè', pt: 'café' },
      shirt: { es: 'camisa', fr: 'chemise', de: 'hemd', it: 'camicia', pt: 'camisa' }
    };
    return translations[objectId]?.[selectedLanguage] || objectId;
  };

  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = selectedLanguage === 'zh' ? 'zh-CN' : `${selectedLanguage}-${selectedLanguage.toUpperCase()}`;
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="bg-white rounded-xl p-8 shadow-2xl max-w-4xl w-full mx-4">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Learning Card */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">Learning: {object.name}</h3>
              <div className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                +10 XP
              </div>
            </div>
            
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-primary mb-2">
                {getTranslation(object.id)}
              </div>
              <div className="text-lg text-muted-foreground">
                {object.name}
              </div>
            </div>
            
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => speakWord(getTranslation(object.id))}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center"
              >
                🔊 Pronounce
              </button>
              <button className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center">
                🔄 Practice
              </button>
            </div>
          </div>

          {/* Quick Practice Card */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-6">Quick Practice</h3>
            
            <div className="text-center mb-6">
              <p className="text-muted-foreground mb-2">
                How do you say "{object.name}" in {selectedLanguage === 'es' ? 'Spanish' : 'your language'}?
              </p>
              <div className="text-2xl font-bold text-primary">
                {getTranslation(object.id)}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg">
                I know this!
              </button>
              <button className="flex-1 border border-gray-300 hover:bg-gray-50 py-2 rounded-lg">
                Study more
              </button>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-6">
          <button
            onClick={onNext}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium"
          >
            Next Object →
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Interactive Objects Scene Component
interface InteractiveObjectsSceneProps {
  selectedLanguage?: string;
  onObjectClick?: (obj: any) => void;
  selectedObject?: any;
}

export const InteractiveObjectsScene: React.FC<InteractiveObjectsSceneProps> = ({ 
  selectedLanguage = 'es', 
  onObjectClick,
  selectedObject 
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showQuestion, setShowQuestion] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentObject = objects[currentSlide];

  // Set loading to false after a brief delay to ensure models are ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300); // Reduced delay for faster loading
    
    return () => clearTimeout(timer);
  }, []);

  const handleObjectClick = (object: any) => {
    setShowQuestion(true);
  };

  const handleAnswer = (isCorrect: boolean) => {
    setAnsweredCorrectly(isCorrect);
    setShowQuestion(false);
    setShowResult(true);
  };

  const handleNext = () => {
    setShowResult(false);
    setCurrentSlide((prev) => (prev + 1) % objects.length);
  };

  const handlePrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + objects.length) % objects.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % objects.length);
  };

  // Don't render anything while loading
  if (isLoading) {
    return (
      <div className="relative w-full h-full">
        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading 3D Models...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <Canvas 
        camera={{ 
          position: [0, 2, 5],
          fov: 60,
          near: 0.1,
          far: 100
        }}
      >
        {/* Enhanced lighting setup */}
        <ambientLight intensity={1.2} />
        <directionalLight position={[5, 5, 5]} intensity={2} />
        <directionalLight position={[-5, 5, 5]} intensity={1.5} />
        <pointLight position={[5, 3, 3]} intensity={1.2} />
        <pointLight position={[-5, 3, 3]} intensity={1.2} />
        <pointLight position={[0, 5, 0]} intensity={1} />
        <spotLight position={[0, 8, 4]} intensity={1.5} angle={0.6} penumbra={0.1} />
        <spotLight position={[3, 8, 4]} intensity={1.2} angle={0.4} penumbra={0.2} />
        <spotLight position={[-3, 8, 4]} intensity={1.2} angle={0.4} penumbra={0.2} />
        
        <Suspense fallback={<Html center><div className='text-lg text-gray-500'>Loading model...</div></Html>}>
          <ModelErrorBoundary>
            <InteractiveObject
              key={currentObject.id}
              object={currentObject}
              isActive={true}
              onObjectClick={handleObjectClick}
              isSelected={false}
            />
          </ModelErrorBoundary>
        </Suspense>
        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#f0f0f0" transparent opacity={0.3} />
        </mesh>
      </Canvas>
      
      {/* Left Arrow Button */}
      <button
        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white text-xl font-bold transition-all duration-200 backdrop-blur-sm"
        onClick={handlePrevious}
        aria-label="Previous Model"
      >
        ←
      </button>
      
      {/* Right Arrow Button */}
      <button
        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white text-xl font-bold transition-all duration-200 backdrop-blur-sm"
        onClick={handleNextSlide}
        aria-label="Next Model"
      >
        →
      </button>

      {/* Progress dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {objects.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentSlide ? 'bg-blue-500' : 'bg-white/60 hover:bg-white/80'
            }`}
            aria-label={`Go to ${objects[index].name}`}
          />
        ))}
      </div>

      {/* Question overlay */}
      {showQuestion && (
        <MultipleChoiceQuestion
          object={currentObject}
          onAnswer={handleAnswer}
          selectedLanguage={selectedLanguage}
        />
      )}

      {/* Result overlay */}
      {showResult && answeredCorrectly && (
        <LearningResult
          object={currentObject}
          selectedLanguage={selectedLanguage}
          onNext={handleNext}
        />
      )}
    </div>
  );
};

export default InteractiveObjectsScene; 