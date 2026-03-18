/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserCheck, 
  Shield, 
  Skull, 
  Search, 
  Heart, 
  Star, 
  Sword, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  ChevronRight, 
  Play,
  XCircle,
  Plus,
  Minus,
  Pause,
  Home
} from 'lucide-react';

// --- Types ---

type RoleType = 'citizen' | 'mafia' | 'don' | 'commissioner' | 'doctor' | 'beauty' | 'maniac';

interface Role {
  id: RoleType;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

interface Player {
  id: number;
  role: Role;
  isAlive: boolean;
}

type GameStage = 'home' | 'setup' | 'distribution' | 'moderator_start' | 'moderator_dashboard';

// --- Constants ---

const ROLES: Record<RoleType, Role> = {
  citizen: { 
    id: 'citizen', 
    name: 'Мирный житель', 
    icon: <Users className="w-8 h-8" />, 
    color: 'bg-slate-500', 
    description: 'Обычный житель города, пытающийся вычислить мафию.' 
  },
  mafia: { 
    id: 'mafia', 
    name: 'Мафия', 
    icon: <Skull className="w-8 h-8" />, 
    color: 'bg-red-700', 
    description: 'Член преступной группировки, устраняющий жителей ночью.' 
  },
  don: { 
    id: 'don', 
    name: 'Дон мафии', 
    icon: <Star className="w-8 h-8" />, 
    color: 'bg-red-900', 
    description: 'Глава мафии, ищет комиссара ночью.' 
  },
  commissioner: { 
    id: 'commissioner', 
    name: 'Комиссар', 
    icon: <Search className="w-8 h-8" />, 
    color: 'bg-blue-600', 
    description: 'Проверяет игроков ночью, чтобы узнать их роль.' 
  },
  doctor: { 
    id: 'doctor', 
    name: 'Доктор', 
    icon: <Heart className="w-8 h-8" />, 
    color: 'bg-green-600', 
    description: 'Лечит одного игрока ночью, спасая от смерти.' 
  },
  beauty: { 
    id: 'beauty', 
    name: 'Красотка', 
    icon: <Star className="w-8 h-8" />, 
    color: 'bg-pink-500', 
    description: 'Блокирует способности игрока на одну ночь.' 
  },
  maniac: { 
    id: 'maniac', 
    name: 'Маньяк', 
    icon: <Sword className="w-8 h-8" />, 
    color: 'bg-orange-600', 
    description: 'Одиночка, убивающий любого игрока ночью.' 
  },
};

// --- Components ---

export default function App() {
  const [stage, setStage] = useState<GameStage>('home');
  const [roleCounts, setRoleCounts] = useState<Record<RoleType, number>>({
    citizen: 6,
    mafia: 2,
    don: 1,
    commissioner: 1,
    doctor: 0,
    beauty: 0,
    maniac: 0,
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [hasSeenRole, setHasSeenRole] = useState(false);
  const [showRolesToModerator, setShowRolesToModerator] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playerCount = (Object.values(roleCounts) as number[]).reduce((sum, count) => sum + count, 0);

  const handleStartSetup = () => setStage('setup');

  const handleDistributeRoles = () => {
    const rolePool: Role[] = [];
    (Object.entries(roleCounts) as [RoleType, number][]).forEach(([type, count]) => {
      for (let i = 0; i < count; i++) {
        rolePool.push(ROLES[type]);
      }
    });

    // Shuffle
    const shuffled = [...rolePool].sort(() => Math.random() - 0.5);
    
    const newPlayers: Player[] = shuffled.map((role, index) => ({
      id: index + 1,
      role,
      isAlive: true,
    }));

    setPlayers(newPlayers);
    setCurrentPlayerIndex(0);
    setIsCardFlipped(false);
    setHasSeenRole(false);
    setStage('distribution');
  };

  const handleNextPlayer = () => {
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1);
      setIsCardFlipped(false);
      setHasSeenRole(false);
    } else {
      setStage('moderator_start');
    }
  };

  const toggleEliminatePlayer = (id: number) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, isAlive: !p.isAlive } : p));
  };

  const resetGame = () => {
    setStage('home');
    setPlayers([]);
  };

  // --- Renderers ---

  const renderHome = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-screen p-6 text-center"
    >
      <h1 className="text-8xl font-black tracking-tighter mb-8 text-white drop-shadow-2xl">
        MAFIA
      </h1>
      <p className="text-slate-400 mb-12 max-w-md text-lg">
        Профессиональный инструмент для распределения ролей и управления игрой.
      </p>
      <button 
        onClick={handleStartSetup}
        className="px-12 py-4 bg-white text-black font-bold rounded-full text-xl hover:scale-105 transition-transform shadow-xl flex items-center gap-3"
      >
        <Play className="fill-current" /> СОЗДАТЬ ИГРУ
      </button>
    </motion.div>
  );

  const renderSetup = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto min-h-screen p-8 flex flex-col"
    >
      <div className="flex items-center gap-4 mb-12">
        <button onClick={resetGame} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <RotateCcw className="w-6 h-6 text-white" />
        </button>
        <h2 className="text-4xl font-bold text-white">Настройка игры</h2>
      </div>

      <div className="space-y-8 flex-grow">
        <section className="bg-white/5 p-8 rounded-3xl border border-white/10 text-center">
          <h3 className="text-slate-400 uppercase tracking-widest text-xs mb-2">Всего игроков</h3>
          <div className="text-7xl font-black text-white tabular-nums">{playerCount}</div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.entries(ROLES) as [RoleType, Role][]).map(([key, role]) => {
            return (
              <div key={key} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${role.color}`}>
                    {React.cloneElement(role.icon as React.ReactElement, { className: 'w-5 h-5 text-white' })}
                  </div>
                  <span className="text-white font-medium">{role.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setRoleCounts(prev => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }))}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-white font-mono w-6 text-center">{roleCounts[key]}</span>
                  <button 
                    onClick={() => setRoleCounts(prev => ({ ...prev, [key]: prev[key] + 1 }))}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <button 
        onClick={handleDistributeRoles}
        disabled={playerCount === 0}
        className="mt-8 w-full py-5 bg-white text-black font-bold rounded-2xl text-xl hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
      >
        РАЗДАТЬ РОЛИ
      </button>
    </motion.div>
  );

  const renderDistribution = () => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return null;

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md mx-auto min-h-screen p-8 flex flex-col items-center justify-center"
      >
        <div className="mb-8 text-center">
          <h3 className="text-slate-400 uppercase tracking-widest text-sm mb-2">Игрок {currentPlayerIndex + 1} из {players.length}</h3>
          <h2 className="text-2xl font-bold text-white">Узнай свою роль</h2>
        </div>

        <div 
          className="relative w-full aspect-[3/4] cursor-pointer perspective-1000"
          onClick={() => {
            const nextFlipped = !isCardFlipped;
            setIsCardFlipped(nextFlipped);
            if (nextFlipped) {
              setHasSeenRole(true);
            }
          }}
        >
          <motion.div
            className="w-full h-full transition-all duration-500 preserve-3d"
            animate={{ rotateY: isCardFlipped ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            {/* Front (Shirt) */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-slate-800 border-4 border-white/20 rounded-[2rem] flex flex-col items-center justify-center shadow-2xl overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
              <div className="w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center">
                <Skull className="w-12 h-12 text-white/20" />
              </div>
              <p className="mt-6 text-white/30 font-black text-2xl tracking-tighter">MAFIA</p>
            </div>

            {/* Back (Role) */}
            <div 
              className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 ${currentPlayer.role.color} border-4 border-white rounded-[2rem] flex flex-col items-center justify-center p-8 text-center shadow-2xl`}
            >
              <div className="mb-6 p-6 bg-white/20 rounded-full">
                {React.cloneElement(currentPlayer.role.icon as React.ReactElement, { className: 'w-16 h-16 text-white' })}
              </div>
              <h3 className="text-3xl font-black text-white mb-4 uppercase">{currentPlayer.role.name}</h3>
              <p className="text-white/80 text-sm leading-relaxed">
                {currentPlayer.role.description}
              </p>
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {hasSeenRole && !isCardFlipped && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => {
                e.stopPropagation();
                handleNextPlayer();
              }}
              className="mt-12 w-full py-4 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors shadow-lg"
            >
              {currentPlayerIndex === players.length - 1 ? 'ПЕРЕДАТЬ ВЕДУЩЕМУ' : 'СЛЕДУЮЩИЙ ИГРОК'}
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
        
        {!hasSeenRole && !isCardFlipped && (
          <p className="mt-8 text-slate-500 text-sm animate-pulse">Нажми на карту, чтобы узнать роль</p>
        )}

        {hasSeenRole && isCardFlipped && (
          <p className="mt-8 text-slate-500 text-sm animate-pulse">Нажми еще раз, чтобы скрыть роль</p>
        )}
      </motion.div>
    );
  };

  const renderModeratorStart = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-screen p-6 text-center"
    >
      <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-8">
        <UserCheck className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-4xl font-bold text-white mb-4">Все роли розданы</h2>
      <p className="text-slate-400 mb-12 max-w-xs">
        Передайте устройство ведущему для управления игрой.
      </p>
      <button 
        onClick={() => setStage('moderator_dashboard')}
        className="px-12 py-5 bg-white text-black font-bold rounded-2xl text-xl hover:scale-105 transition-transform shadow-xl"
      >
        НАЧАТЬ ИГРУ
      </button>
    </motion.div>
  );

  const renderModeratorDashboard = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto min-h-screen p-8 relative"
    >
      {/* Top Bar with Home Button */}
      <div className="flex justify-end mb-4">
        <button 
          onClick={() => setShowExitConfirmation(true)}
          className="p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
          title="На главную"
        >
          <Home className="w-6 h-6" />
        </button>
      </div>

      {/* Timer Section */}
      <div className="flex flex-col items-center mb-12 p-6 bg-white/5 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-8 mb-6">
          <button 
            onClick={() => setTimeLeft(prev => Math.max(0, prev - 10))}
            className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <Minus className="w-6 h-6" />
          </button>
          
          <div className="text-7xl font-black text-white tabular-nums tracking-tighter">
            {formatTime(timeLeft)}
          </div>

          <button 
            onClick={() => setTimeLeft(prev => prev + 10)}
            className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all ${
              isTimerRunning 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            {isTimerRunning ? 'ПАУЗА' : 'СТАРТ'}
          </button>
          
          <button 
            onClick={() => {
              setIsTimerRunning(false);
              setTimeLeft(60);
            }}
            className="p-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-colors"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mb-12">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowRolesToModerator(!showRolesToModerator)}
            className={`p-3 rounded-xl transition-colors ${showRolesToModerator ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
            title={showRolesToModerator ? 'Скрыть роли' : 'Показать роли'}
          >
            {showRolesToModerator ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showExitConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-6">Вы уверены, что хотите завершить игру?</h3>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setShowExitConfirmation(false);
                    resetGame();
                  }}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                >
                  Да
                </button>
                <button 
                  onClick={() => setShowExitConfirmation(false)}
                  className="flex-1 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
                >
                  Нет
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map((player) => (
          <motion.div 
            key={player.id}
            layout
            className={`relative p-5 rounded-3xl border transition-all duration-300 ${
              !player.isAlive 
                ? 'bg-black/40 border-white/5 grayscale opacity-50' 
                : 'bg-white/5 border-white/10 hover:border-white/30'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${!player.isAlive ? 'bg-slate-800 text-slate-500' : 'bg-white text-black'}`}>
                  {player.id}
                </div>
                <div>
                  <h4 className={`font-bold ${!player.isAlive ? 'text-slate-500 line-through' : 'text-white'}`}>
                    Игрок {player.id}
                  </h4>
                  <span className={`text-xs font-medium uppercase tracking-wider ${!player.isAlive ? 'text-red-500/50' : 'text-green-500'}`}>
                    {player.isAlive ? 'В игре' : 'Выбыл'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => toggleEliminatePlayer(player.id)}
                className={`p-2 rounded-lg transition-colors ${player.isAlive ? 'text-slate-500 hover:bg-red-500/20 hover:text-red-500' : 'text-green-500 hover:bg-green-500/20'}`}
                title={player.isAlive ? "Исключить" : "Вернуть в игру"}
              >
                {player.isAlive ? <Skull className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
              </button>
            </div>

            <div className={`mt-4 p-3 rounded-2xl flex items-center gap-3 transition-all duration-500 ${showRolesToModerator ? player.role.color : 'bg-white/10'}`}>
              <div className="text-white">
                {showRolesToModerator ? player.role.icon : <Shield className="w-6 h-6 opacity-20" />}
              </div>
              <span className="text-white font-bold text-sm uppercase tracking-tight">
                {showRolesToModerator ? player.role.name : '••••••••'}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {!players.some(p => p.isAlive) && (
        <div className="mt-12 text-center p-12 bg-white/5 rounded-3xl border border-dashed border-white/20">
          <p className="text-slate-500">Все игроки выбыли. Игра окончена.</p>
          <button onClick={resetGame} className="mt-4 text-white font-bold underline">Начать заново</button>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 font-sans selection:bg-white selection:text-black">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full"></div>
      </div>

      <main className="relative z-10">
        {stage === 'home' && renderHome()}
        {stage === 'setup' && renderSetup()}
        {stage === 'distribution' && renderDistribution()}
        {stage === 'moderator_start' && renderModeratorStart()}
        {stage === 'moderator_dashboard' && renderModeratorDashboard()}
      </main>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
