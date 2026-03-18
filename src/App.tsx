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
  ChevronLeft, 
  Play,
  XCircle,
  Plus,
  Minus,
  Pause,
  Home,
  Gavel,
  User,
  UserPlus,
  UserMinus,
  AlertTriangle,
  Timer,
  Lock
} from 'lucide-react';
import Auth from './components/Auth';
import Friends from './components/Friends';

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
  name: string;
  role: Role;
  isAlive: boolean;
  fouls: number;
}

type GameStage = 'home' | 'setup' | 'player_names' | 'distribution' | 'moderator_start' | 'admin_pin' | 'moderator_dashboard' | 'profile';
type GamePhase = 'night_acquaintance' | 'day_speech' | 'general_discussion' | 'defense' | 'voting' | 'night_action' | 'morning_results';

// --- Constants ---

const ADMIN_PIN = '362134';

const ACTIVE_ROLES_ORDER: RoleType[] = ['mafia', 'don', 'maniac', 'doctor', 'commissioner', 'beauty'];

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

// --- Audio ---
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

const playTick = () => {
  try {
    const ctx = initAudio();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

const playRing = () => {
  try {
    const ctx = initAudio();
    
    const playNote = (freq: number, delay: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const startTime = ctx.currentTime + delay;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 2);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 2);
    };
    
    playNote(523.25, 0); // C5
    playNote(659.25, 0.1); // E5
    playNote(783.99, 0.2); // G5
    playNote(1046.50, 0.3); // C6
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

// --- Components ---

function useLocalStorage<T>(key: string, initialValue: T, parser?: (val: any) => T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        return parser ? parser(parsed) : parsed;
      }
      return initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [showFriends, setShowFriends] = useState(false);
  const [playerNames, setPlayerNames] = useLocalStorage<string[]>('mafia_playerNames', []);
  const [stage, setStage] = useLocalStorage<GameStage>('mafia_stage', 'home');
  const [roleCounts, setRoleCounts] = useLocalStorage<Record<RoleType, number>>('mafia_roleCounts', {
    citizen: 6,
    mafia: 2,
    don: 1,
    commissioner: 1,
    doctor: 0,
    beauty: 0,
    maniac: 0,
  });
  const [players, setPlayers] = useLocalStorage<Player[]>('mafia_players', [], (parsedPlayers) => {
    if (!Array.isArray(parsedPlayers)) return [];
    return parsedPlayers.map((p: any) => ({
      ...p,
      role: ROLES[p.role?.id as RoleType] || p.role
    }));
  });
  const [currentPlayerIndex, setCurrentPlayerIndex] = useLocalStorage('mafia_currentPlayerIndex', 0);
  const [isCardFlipped, setIsCardFlipped] = useLocalStorage('mafia_isCardFlipped', false);
  const [hasSeenRole, setHasSeenRole] = useLocalStorage('mafia_hasSeenRole', false);
  const [showRolesToModerator, setShowRolesToModerator] = useLocalStorage('mafia_showRolesToModerator', true);
  const [timeLeft, setTimeLeft] = useLocalStorage('mafia_timeLeft', 60);
  const [isTimerRunning, setIsTimerRunning] = useLocalStorage('mafia_isTimerRunning', false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false); // Don't persist UI modal
  const [nominatedIds, setNominatedIds] = useLocalStorage<number[]>('mafia_nominatedIds', []);
  
  // Game Algorithm States
  const [gamePhase, setGamePhase] = useLocalStorage<GamePhase>('mafia_gamePhase', 'night_acquaintance');
  const [dayNumber, setDayNumber] = useLocalStorage('mafia_dayNumber', 1);
  const [currentRoleIndex, setCurrentRoleIndex] = useLocalStorage('mafia_currentRoleIndex', 0);
  const [nightActions, setNightActions] = useLocalStorage<Record<string, number>>('mafia_nightActions', {});
  const [commissionerResult, setCommissionerResult] = useLocalStorage<'hit' | 'miss' | null>('mafia_commissionerResult', null);
  const [speakingPlayerIndex, setSpeakingPlayerIndex] = useLocalStorage('mafia_speakingPlayerIndex', 0);
  const [showNominationModal, setShowNominationModal] = useState(false); // Don't persist UI modal
  const [nightKilledIds, setNightKilledIds] = useLocalStorage<number[]>('mafia_nightKilledIds', []);

  const [isVotingMode, setIsVotingMode] = useLocalStorage('mafia_isVotingMode', false);
  const [votingStep, setVotingStep] = useLocalStorage<'nominate' | 'announce' | 'vote' | 'crash_justification' | 'crash_vote' | 'result' | 'last_word' | 'night'>('mafia_votingStep', 'nominate');
  const [currentVotingPlayerIndex, setCurrentVotingPlayerIndex] = useLocalStorage('mafia_currentVotingPlayerIndex', 0);
  const [votes, setVotes] = useLocalStorage<Record<number, number>>('mafia_votes', {});
  const [crashPlayerIds, setCrashPlayerIds] = useLocalStorage<number[]>('mafia_crashPlayerIds', []);
  const [crashSpeakerIndex, setCrashSpeakerIndex] = useLocalStorage('mafia_crashSpeakerIndex', 0);
  const [eliminatedPlayerId, setEliminatedPlayerId] = useLocalStorage<number | null>('mafia_eliminatedPlayerId', null);
  const [eliminatedPlayerIds, setEliminatedPlayerIds] = useLocalStorage<number[]>('mafia_eliminatedPlayerIds', []);
  const [eliminatedSpeakerIndex, setEliminatedSpeakerIndex] = useLocalStorage('mafia_eliminatedSpeakerIndex', 0);
  const [lastWordTime, setLastWordTime] = useLocalStorage('mafia_lastWordTime', 30);
  const [isLastWordRunning, setIsLastWordRunning] = useLocalStorage('mafia_isLastWordRunning', false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLastWordRunning && lastWordTime > 0) {
      interval = setInterval(() => {
        setLastWordTime((prev) => {
          const newTime = prev - 1;
          if (newTime <= 10 && newTime > 0) {
            playTick();
          } else if (newTime === 0) {
            playRing();
          }
          return newTime;
        });
      }, 1000);
    } else if (lastWordTime === 0) {
      setIsLastWordRunning(false);
    }
    return () => clearInterval(interval);
  }, [isLastWordRunning, lastWordTime]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          if (newTime <= 10 && newTime > 0) {
            playTick();
          } else if (newTime === 0) {
            playRing();
          }
          return newTime;
        });
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

  const handleStartPlayerNames = () => {
    const total = Object.values(roleCounts).reduce((a, b) => a + b, 0);
    // Initialize or adjust names array
    const newNames = [...playerNames];
    if (newNames.length < total) {
      for (let i = newNames.length; i < total; i++) {
        newNames.push(`Игрок ${i + 1}`);
      }
    } else if (newNames.length > total) {
      newNames.splice(total);
    }
    setPlayerNames(newNames);
    setStage('player_names');
  };

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
      name: playerNames[index] || `Игрок ${index + 1}`,
      role,
      isAlive: true,
      fouls: 0,
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
    // Remove from nominations if eliminated
    setNominatedIds(prev => prev.filter(i => i !== id));
  };

  const toggleNomination = (id: number) => {
    setNominatedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleFoul = (id: number) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, fouls: Math.min(4, p.fouls + 1) } : p));
  };

  const handleVote = (playerId: number, count: number) => {
    setVotes(prev => ({ ...prev, [playerId]: count }));
  };

  const finishVoting = () => {
    const finalVotes = { ...votes };
    if (nominatedIds.length > 0) {
      const lastPlayerId = nominatedIds[nominatedIds.length - 1];
      const currentTotalVotes = Object.values(votes).reduce((sum, v) => (sum as number) + (v as number), 0) as number;
      const totalAlive = players.filter(p => p.isAlive).length;
      const remainingVotes = totalAlive - (currentTotalVotes - (votes[lastPlayerId] || 0));
      finalVotes[lastPlayerId] = remainingVotes;
    }
    setVotes(finalVotes);

    const sortedVotes = Object.entries(finalVotes)
      .filter(([_, count]) => (count as number) > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number));
    
    if (sortedVotes.length === 0) {
      setIsVotingMode(false);
      setNominatedIds([]);
      setVotingStep('nominate');
      return;
    }

    const maxVotes = sortedVotes[0][1] as number;
    const topVotedIds = sortedVotes
      .filter(([_, count]) => (count as number) === maxVotes)
      .map(([id, _]) => parseInt(id));

    if (topVotedIds.length > 1) {
      // Car Crash!
      setCrashPlayerIds(topVotedIds);
      setCrashSpeakerIndex(0);
      setVotingStep('crash_justification');
      setTimeLeft(30);
      setIsTimerRunning(false);
    } else {
      const winnerId = topVotedIds[0];
      setEliminatedPlayerId(winnerId);
      setEliminatedPlayerIds([winnerId]);
      setVotingStep('result');
    }
  };

  const finishCrashVoting = () => {
    const sortedVotes = Object.entries(votes)
      .filter(([_, count]) => (count as number) > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number));

    if (sortedVotes.length === 0) {
      setIsVotingMode(false);
      setNominatedIds([]);
      setVotingStep('nominate');
      return;
    }

    const maxVotes = sortedVotes[0][1] as number;
    const topVotedIds = sortedVotes
      .filter(([_, count]) => (count as number) === maxVotes)
      .map(([id, _]) => parseInt(id));

    if (topVotedIds.length > 1) {
      // Tie in re-vote: Everyone stays
      setIsVotingMode(false);
      setNominatedIds([]);
      setVotingStep('nominate');
    } else {
      const winnerId = topVotedIds[0];
      setEliminatedPlayerId(winnerId);
      setEliminatedPlayerIds([winnerId]);
      setVotingStep('result');
    }
  };

  const startLastWord = () => {
    setLastWordTime(30);
    setEliminatedSpeakerIndex(0);
    setVotingStep('last_word');
    setIsLastWordRunning(true);
  };

  const nextLastWord = () => {
    if (eliminatedSpeakerIndex < eliminatedPlayerIds.length - 1) {
      setEliminatedSpeakerIndex(prev => prev + 1);
      setLastWordTime(30);
      setIsLastWordRunning(true);
    } else {
      confirmElimination();
    }
  };

  const confirmElimination = () => {
    eliminatedPlayerIds.forEach(id => {
      setPlayers(prev => prev.map(p => p.id === id ? { ...p, isAlive: false } : p));
    });
    setEliminatedPlayerId(null);
    setEliminatedPlayerIds([]);
    setEliminatedSpeakerIndex(0);
    setIsLastWordRunning(false);
    setVotingStep('night');
  };

  const handleNightEnd = () => {
    const killed = new Set<number>();
    const mafiaTarget = nightActions['mafia'] || nightActions['don'];
    const maniacTarget = nightActions['maniac'];
    const doctorTarget = nightActions['doctor'];

    if (mafiaTarget && mafiaTarget !== doctorTarget) killed.add(mafiaTarget);
    if (maniacTarget && maniacTarget !== doctorTarget) killed.add(maniacTarget);

    setNightKilledIds(Array.from(killed));
    setGamePhase('morning_results');
  };

  const nextNightRole = (aliveActiveRoles: RoleType[]) => {
    if (currentRoleIndex < aliveActiveRoles.length - 1) {
      setCurrentRoleIndex(prev => prev + 1);
    } else {
      handleNightEnd();
    }
  };

  const resetGame = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('mafia_')) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  };

  // --- Renderers ---

  const renderHome = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center relative"
    >
      <button 
        onClick={() => setShowFriends(true)}
        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center gap-2 text-white"
      >
        <Users className="w-5 h-5" />
        <span className="hidden sm:inline font-medium">Друзья</span>
      </button>

      <button 
        onClick={() => setStage('profile')}
        className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center gap-2 text-white"
      >
        <User className="w-5 h-5" />
        <span className="hidden sm:inline font-medium">Профиль</span>
      </button>

      <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter mb-4 text-white drop-shadow-2xl">
        MAFIA
      </h1>
      <p className="text-slate-400 mb-10 max-w-xs sm:max-w-md text-base sm:text-lg leading-relaxed">
        Профессиональный инструмент для распределения ролей и управления игрой.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <button 
          onClick={handleStartSetup}
          className="flex-1 px-10 py-4 bg-white text-black font-bold rounded-2xl text-lg sm:text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3"
        >
          <Plus className="w-6 h-6" /> НОВАЯ ИГРА
        </button>
        {players.length > 0 && (
          <button 
            onClick={() => {
              if (stage === 'moderator_dashboard' || stage === 'admin_pin') {
                setStage('admin_pin');
              } else {
                // Keep current stage
              }
            }}
            className="flex-1 px-10 py-4 bg-white/10 text-white font-bold rounded-2xl text-lg sm:text-xl hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/10"
          >
            <Play className="w-6 h-6 fill-current" /> ПРОДОЛЖИТЬ
          </button>
        )}
      </div>
    </motion.div>
  );

  const renderSetup = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto min-h-[100dvh] p-4 sm:p-8 flex flex-col"
    >
      <div className="flex items-center gap-4 mb-8 sm:mb-12">
        <button onClick={resetGame} className="p-3 hover:bg-white/10 rounded-xl transition-colors">
          <RotateCcw className="w-6 h-6 text-white" />
        </button>
        <h2 className="text-3xl sm:text-4xl font-bold text-white">Настройка</h2>
      </div>

      <div className="space-y-6 sm:space-y-8 flex-grow">
        <section className="bg-white/5 p-6 sm:p-8 rounded-3xl border border-white/10 text-center shadow-inner">
          <h3 className="text-slate-500 uppercase tracking-[0.2em] text-[10px] sm:text-xs mb-2 font-bold">Всего игроков</h3>
          <div className="text-6xl sm:text-7xl font-black text-white tabular-nums tracking-tighter">{playerCount}</div>
        </section>

        <section className="grid grid-cols-1 gap-3">
          {(Object.entries(ROLES) as [RoleType, Role][]).map(([key, role]) => {
            return (
              <div key={key} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between group hover:bg-white/[0.07] transition-colors">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`p-2.5 rounded-xl ${role.color} shadow-lg`}>
                    {React.cloneElement(role.icon as React.ReactElement, { className: 'w-5 h-5 text-white' })}
                  </div>
                  <span className="text-white font-semibold text-sm sm:text-base">{role.name}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <button 
                    onClick={() => setRoleCounts(prev => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }))}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-90 transition-all"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="text-white font-mono w-6 text-center text-lg font-bold">{roleCounts[key]}</span>
                  <button 
                    onClick={() => setRoleCounts(prev => ({ ...prev, [key]: prev[key] + 1 }))}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-90 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <button 
        onClick={handleStartPlayerNames}
        disabled={playerCount === 0}
        className="mt-8 w-full py-5 bg-white text-black font-black rounded-2xl text-lg sm:text-xl hover:bg-slate-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl uppercase tracking-wider"
      >
        Далее
      </button>
    </motion.div>
  );

  const renderPlayerNames = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto min-h-[100dvh] p-4 sm:p-8 flex flex-col"
    >
      <div className="flex items-center gap-4 mb-8 sm:mb-12">
        <button onClick={() => setStage('setup')} className="p-3 hover:bg-white/10 rounded-xl transition-colors">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <h2 className="text-3xl sm:text-4xl font-bold text-white">Имена игроков</h2>
      </div>

      <div className="space-y-3 flex-grow overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
        {playerNames.map((name, index) => (
          <div key={index} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold shrink-0">
              {index + 1}
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                const newNames = [...playerNames];
                newNames[index] = e.target.value;
                setPlayerNames(newNames);
              }}
              placeholder={`Имя игрока ${index + 1}`}
              className="bg-transparent border-none text-white w-full focus:ring-0 text-lg font-medium placeholder:text-white/20"
            />
          </div>
        ))}
      </div>

      <button 
        onClick={handleDistributeRoles}
        className="mt-8 w-full py-5 bg-white text-black font-black rounded-2xl text-lg sm:text-xl hover:bg-slate-200 active:scale-[0.98] transition-all shadow-2xl uppercase tracking-wider"
      >
        Раздать роли
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
        className="max-w-md mx-auto min-h-[100dvh] p-6 sm:p-8 flex flex-col items-center justify-center"
      >
        <div className="mb-8 text-center">
          <h3 className="text-slate-500 uppercase tracking-[0.2em] text-[10px] sm:text-xs mb-2 font-bold">Игрок {currentPlayerIndex + 1} из {players.length}</h3>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{currentPlayer.name}</h2>
        </div>

        <motion.div 
          className="relative w-full max-w-[320px] aspect-[3/4.5] cursor-pointer perspective-1000 select-none touch-manipulation"
          onClick={() => {
            const nextFlipped = !isCardFlipped;
            setIsCardFlipped(nextFlipped);
            if (nextFlipped) {
              setHasSeenRole(true);
            }
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            className="w-full h-full preserve-3d relative"
            animate={{ rotateY: isCardFlipped ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            {/* Front (Shirt) */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-slate-900 border-4 border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center shadow-2xl overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
              <div className="w-24 h-24 rounded-full border-4 border-white/10 flex items-center justify-center bg-white/5">
                <Skull className="w-12 h-12 text-white/20" />
              </div>
              <p className="mt-8 text-white/20 font-black text-3xl tracking-tighter uppercase">MAFIA</p>
            </div>

            {/* Back (Role) */}
            <div 
              className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 ${currentPlayer.role.color} border-4 border-white rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center shadow-2xl`}
            >
              <div className="mb-6 p-6 bg-white/20 rounded-full shadow-inner">
                {React.cloneElement(currentPlayer.role.icon as React.ReactElement, { className: 'w-16 h-16 text-white' })}
              </div>
              <h3 className="text-3xl sm:text-4xl font-black text-white mb-4 uppercase tracking-tighter">{currentPlayer.role.name}</h3>
              <p className="text-white/90 text-sm sm:text-base leading-relaxed font-medium">
                {currentPlayer.role.description}
              </p>
            </div>
          </motion.div>
        </motion.div>

        <div className="mt-8 h-20 w-full max-w-[320px] relative flex justify-center">
          <div 
            className={`absolute inset-0 transition-all duration-300 ${
              hasSeenRole && !isCardFlipped 
                ? 'opacity-100 translate-y-0 pointer-events-auto' 
                : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextPlayer();
              }}
              className="w-full h-full bg-white text-black font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 active:scale-95 transition-all shadow-2xl uppercase tracking-wider"
            >
              {currentPlayerIndex === players.length - 1 ? 'ВЕДУЩЕМУ' : 'СЛЕДУЮЩИЙ'}
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
          
          <div 
            className={`absolute top-4 transition-all duration-300 ${
              !(hasSeenRole && !isCardFlipped)
                ? 'opacity-100 pointer-events-auto' 
                : 'opacity-0 pointer-events-none'
            }`}
          >
            <p className="text-slate-500 text-sm font-medium animate-pulse">
              {!hasSeenRole ? 'Нажми на карту, чтобы открыть' : 'Нажми еще раз, чтобы скрыть'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderModeratorStart = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center"
    >
      <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl">
        <UserCheck className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 uppercase tracking-tighter">Все роли розданы</h2>
      <p className="text-slate-400 mb-12 max-w-xs text-sm sm:text-base font-medium leading-relaxed">
        Передайте устройство ведущему для управления игрой.
      </p>
      <button 
        onClick={() => setStage('admin_pin')}
        className="w-full sm:w-auto px-12 py-5 bg-white text-black font-black rounded-2xl text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl uppercase tracking-wider"
      >
        НАЧАТЬ ИГРУ
      </button>
    </motion.div>
  );

  const renderAdminPin = () => {
    const handlePinSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (pinInput === ADMIN_PIN) {
        setStage('moderator_dashboard');
        setNominatedIds([]);
        setGamePhase('night_acquaintance');
        setCurrentRoleIndex(0);
        setPinInput('');
        setPinError(false);
      } else {
        setPinError(true);
        setPinInput('');
      }
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto min-h-[100dvh] p-6 sm:p-8 flex flex-col items-center justify-center"
      >
        <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
          <Lock className="w-10 h-10 text-white" />
        </div>
        
        <h2 className="text-3xl font-black text-white mb-2 text-center uppercase tracking-tight">Вход для ведущего</h2>
        <p className="text-slate-400 text-center mb-8 font-medium">Введите PIN-код администратора</p>

        <form onSubmit={handlePinSubmit} className="w-full space-y-6">
          <div className="relative">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••••"
              className={`w-full bg-white/5 border-2 ${pinError ? 'border-red-500' : 'border-white/10'} rounded-2xl py-5 text-center text-4xl tracking-[0.5em] text-white focus:outline-none focus:border-white/30 transition-all placeholder:text-white/10`}
              autoFocus
            />
            {pinError && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-center mt-4 font-bold text-sm uppercase tracking-wider"
              >
                Неверный PIN-код
              </motion.p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={() => {
                setStage('moderator_start');
                setPinInput('');
                setPinError(false);
              }}
              className="py-5 bg-white/10 text-white font-black rounded-2xl text-lg hover:bg-white/20 active:scale-[0.98] transition-all uppercase tracking-wider"
            >
              Отмена
            </button>
            <button 
              type="submit"
              className="py-5 bg-white text-black font-black rounded-2xl text-lg hover:bg-slate-200 active:scale-[0.98] transition-all shadow-2xl uppercase tracking-wider"
            >
              Войти
            </button>
          </div>
        </form>
      </motion.div>
    );
  };

  const renderModeratorDashboard = () => {
    const activeRolesInGame = ACTIVE_ROLES_ORDER.filter(role => players.some(p => p.role.id === role));
    const aliveActiveRolesInGame = ACTIVE_ROLES_ORDER.filter(role => players.some(p => p.role.id === role && p.isAlive));
    const alivePlayers = players.filter(p => p.isAlive);

    return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto min-h-[100dvh] p-4 sm:p-8 relative pb-32"
    >
      {/* Top Bar with Home Button and Roles Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-slate-500 uppercase tracking-[0.2em] text-[10px] sm:text-xs font-bold">
          Игроки ({alivePlayers.length}/{players.length})
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowRolesToModerator(!showRolesToModerator)}
            className={`p-3.5 rounded-2xl transition-all shadow-lg active:scale-90 ${showRolesToModerator ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title={showRolesToModerator ? 'Скрыть роли' : 'Показать роли'}
          >
            {showRolesToModerator ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
          </button>
          <button 
            onClick={() => setShowExitConfirmation(true)}
            className="p-3.5 bg-white/10 text-white rounded-2xl hover:bg-white/20 active:scale-90 transition-all shadow-lg"
            title="На главную"
          >
            <Home className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Game Phase Headers (Moved above timer) */}
      {gamePhase === 'day_speech' && (
        <div className="text-center mb-6">
          <h2 className="text-4xl font-black text-white mb-2 uppercase">ДЕНЬ {dayNumber}</h2>
          <p className="text-slate-400">Речь игрока</p>
          <div className="text-4xl font-black text-white mt-4">{alivePlayers[speakingPlayerIndex]?.name}</div>
        </div>
      )}

      {gamePhase === 'general_discussion' && (
        <div className="text-center mb-6">
          <h2 className="text-4xl font-black text-white mb-2 uppercase">ОБЩЕЕ ОБСУЖДЕНИЕ</h2>
          <p className="text-slate-400">Свободное общение</p>
        </div>
      )}

      {gamePhase === 'defense' && (
        <div className="text-center mb-6">
          <h2 className="text-4xl font-black text-white mb-2 uppercase">ЗАЩИТА</h2>
          <p className="text-slate-400">Оправдательная речь</p>
          <div className="text-4xl font-black text-white mt-4">{players.find(p => p.id === nominatedIds[speakingPlayerIndex])?.name}</div>
        </div>
      )}

      {/* Timer Section - Only show in day phases */}
      {['day_speech', 'general_discussion', 'defense'].includes(gamePhase) && (
        <div className="flex flex-col items-center mb-10 p-6 sm:p-8 bg-white/5 rounded-[2.5rem] border border-white/10 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-4 sm:gap-10 mb-8">
            <button 
              onClick={() => setTimeLeft(prev => Math.max(0, prev - 10))}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 rounded-2xl text-white flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
            >
              <Minus className="w-6 h-6" />
            </button>
            
            <div className="text-6xl sm:text-8xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg">
              {formatTime(timeLeft)}
            </div>

            <button 
              onClick={() => setTimeLeft(prev => prev + 10)}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 rounded-2xl text-white flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          <div className="flex gap-3 w-full max-w-xs">
            <button 
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95 ${
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
              className="p-4 bg-white/10 text-white rounded-2xl hover:bg-white/20 active:scale-90 transition-all shadow-lg"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Game Phases */}
      {gamePhase === 'night_acquaintance' && (
        <div className="text-center">
          <h2 className="text-4xl font-black text-white mb-4 uppercase">НОЧЬ ЗНАКОМСТВА</h2>
          {activeRolesInGame.length > 0 ? (
            <>
              <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 mb-8">
                <h3 className="text-2xl font-bold text-slate-300 mb-6">Просыпается {ROLES[activeRolesInGame[currentRoleIndex]].name}</h3>
                <div className="flex flex-wrap justify-center gap-4">
                  {players.filter(p => p.role.id === activeRolesInGame[currentRoleIndex]).map(p => (
                    <div key={p.id} className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center text-3xl font-black text-white">
                      {p.id}
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => {
                  if (currentRoleIndex < activeRolesInGame.length - 1) {
                    setCurrentRoleIndex(prev => prev + 1);
                  } else {
                    setGamePhase('day_speech');
                    setDayNumber(1);
                    setSpeakingPlayerIndex(0);
                    setTimeLeft(60);
                    setIsTimerRunning(false);
                  }
                }}
                className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl text-xl hover:bg-indigo-700 transition-all uppercase"
              >
                {currentRoleIndex < activeRolesInGame.length - 1 ? 'ДАЛЕЕ' : 'ДЕНЬ'}
              </button>
            </>
          ) : (
            <button 
              onClick={() => {
                setGamePhase('day_speech');
                setDayNumber(1);
                setSpeakingPlayerIndex(0);
                setTimeLeft(60);
                setIsTimerRunning(false);
              }}
              className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl text-xl hover:bg-indigo-700 transition-all uppercase"
            >
              ДЕНЬ
            </button>
          )}
        </div>
      )}

      {gamePhase === 'day_speech' && (
        <div className="text-center">
          <div className="flex gap-4 mb-8">
            <button 
              onClick={() => setShowNominationModal(true)}
              className="flex-1 py-4 bg-amber-500/20 text-amber-500 border border-amber-500/50 font-bold rounded-2xl transition-all"
            >
              ВЫДВИНУТЬ
            </button>
          </div>

          <button 
            onClick={() => {
              if (speakingPlayerIndex < alivePlayers.length - 1) {
                setSpeakingPlayerIndex(prev => prev + 1);
                setTimeLeft(60);
                setIsTimerRunning(false);
              } else {
                setGamePhase('general_discussion');
                setTimeLeft(60);
                setIsTimerRunning(false);
              }
            }}
            className="w-full py-5 bg-white text-black font-black rounded-2xl text-xl transition-all"
          >
            ДАЛЕЕ
          </button>

          {/* Nomination Modal */}
          {showNominationModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
              <div className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md">
                <h3 className="text-2xl font-black text-white mb-6 text-center">Кого выставить?</h3>
                <div className="grid grid-cols-4 gap-3 mb-8">
                  {alivePlayers.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (!nominatedIds.includes(p.id)) {
                          setNominatedIds(prev => [...prev, p.id]);
                        }
                        setShowNominationModal(false);
                      }}
                      className={`aspect-square rounded-2xl flex items-center justify-center font-black text-2xl transition-all ${
                        nominatedIds.includes(p.id) ? 'bg-amber-500 text-white opacity-50 cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                      disabled={nominatedIds.includes(p.id)}
                    >
                      {p.id}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setShowNominationModal(false)}
                  className="w-full py-4 bg-white/10 text-white font-bold rounded-2xl"
                >
                  ОТМЕНА
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {gamePhase === 'general_discussion' && (
        <div className="text-center">
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Выставленные игроки:</h3>
            {nominatedIds.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-3">
                {nominatedIds.map(id => (
                  <div key={id} className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center font-black text-xl border border-amber-500/50">
                    {id}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">Никто не выставлен</p>
            )}
          </div>

          <button 
            onClick={() => {
              if (nominatedIds.length > 0) {
                setGamePhase('defense');
                setSpeakingPlayerIndex(0);
                setTimeLeft(30);
                setIsTimerRunning(false);
              } else {
                setGamePhase('night_action');
                setDayNumber(prev => prev + 1);
                setCurrentRoleIndex(0);
                setNightActions({});
              }
            }}
            className="w-full py-5 bg-white text-black font-black rounded-2xl text-xl transition-all"
          >
            {nominatedIds.length > 0 ? 'ПЕРЕЙТИ К ЗАЩИТЕ' : 'В НОЧЬ'}
          </button>
        </div>
      )}

      {gamePhase === 'defense' && (
        <div className="text-center">
          <button 
            onClick={() => {
              if (speakingPlayerIndex < nominatedIds.length - 1) {
                setSpeakingPlayerIndex(prev => prev + 1);
                setTimeLeft(30);
                setIsTimerRunning(false);
              } else {
                setGamePhase('voting');
                setVotingStep('announce');
                setVotes({});
                setCurrentVotingPlayerIndex(0);
              }
            }}
            className="w-full py-5 bg-white text-black font-black rounded-2xl text-xl transition-all"
          >
            ДАЛЕЕ
          </button>
        </div>
      )}

      {gamePhase === 'night_action' && (
        <div className="text-center">
          <h2 className="text-4xl font-black text-white mb-4 uppercase">НОЧЬ {dayNumber}</h2>
          
          {aliveActiveRolesInGame.length > 0 ? (
            commissionerResult ? (
              <>
                <h2 className="text-4xl font-black text-white mb-4 uppercase">РЕЗУЛЬТАТ ПРОВЕРКИ</h2>
                <div className={`text-6xl font-black mb-8 ${commissionerResult === 'hit' ? 'text-red-500' : 'text-green-500'}`}>
                  {commissionerResult === 'hit' ? 'ПОПАЛ' : 'МИМО'}
                </div>
                <button 
                  onClick={() => {
                    setCommissionerResult(null);
                    nextNightRole(aliveActiveRolesInGame);
                  }}
                  className="w-full py-5 bg-white text-black font-black rounded-2xl text-xl transition-all"
                >
                  ОК
                </button>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-slate-300 mb-6">Просыпается {ROLES[aliveActiveRolesInGame[currentRoleIndex]].name}</h3>
                
                <div className="grid grid-cols-4 gap-3 mb-8">
                  {alivePlayers.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setNightActions(prev => ({ ...prev, [aliveActiveRolesInGame[currentRoleIndex]]: p.id }))}
                      className={`aspect-square rounded-2xl flex items-center justify-center font-black text-3xl transition-all ${
                        nightActions[aliveActiveRolesInGame[currentRoleIndex]] === p.id ? 'bg-red-600 text-white' : 'bg-white/10 text-white'
                      }`}
                    >
                      {p.id}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => {
                    const currentRole = aliveActiveRolesInGame[currentRoleIndex];
                    if (currentRole === 'commissioner' && nightActions['commissioner']) {
                      const target = players.find(p => p.id === nightActions['commissioner']);
                      if (target && (target.role.id === 'mafia' || target.role.id === 'don')) {
                        setCommissionerResult('hit');
                      } else {
                        setCommissionerResult('miss');
                      }
                    } else {
                      nextNightRole(aliveActiveRolesInGame);
                    }
                  }}
                  disabled={!nightActions[aliveActiveRolesInGame[currentRoleIndex]]}
                  className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl text-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  ОК
                </button>
              </>
            )
          ) : (
            <button 
              onClick={handleNightEnd}
              className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl text-xl hover:bg-indigo-700 transition-all uppercase"
            >
              УТРО
            </button>
          )}
        </div>
      )}

      {gamePhase === 'morning_results' && (
        <div className="text-center">
          <h2 className="text-4xl font-black text-white mb-4 uppercase">УТРО {dayNumber}</h2>
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 mb-8">
            {nightKilledIds.length > 0 ? (
              <>
                <p className="text-xl text-slate-300 mb-4">Этой ночью город покинули:</p>
                <div className="flex justify-center gap-4">
                  {nightKilledIds.map(id => (
                    <div key={id} className="w-20 h-20 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center text-4xl font-black border border-red-500/50">
                      {id}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-2xl text-green-400 font-bold">Этой ночью никто не убит!</p>
            )}
          </div>
          <button 
            onClick={() => {
              setPlayers(prev => prev.map(p => nightKilledIds.includes(p.id) ? { ...p, isAlive: false } : p));
              setNightKilledIds([]);
              setNightActions({});
              setCurrentRoleIndex(0);
              
              setGamePhase('day_speech');
              setSpeakingPlayerIndex(0);
              setTimeLeft(60);
              setIsTimerRunning(false);
              setNominatedIds([]);
            }}
            className="w-full py-5 bg-white text-black font-black rounded-2xl text-xl transition-all"
          >
            НАЧАТЬ ДЕНЬ
          </button>
        </div>
      )}

      {/* Voting Modal / Full Screen */}
      <AnimatePresence>
        {gamePhase === 'voting' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md overscroll-contain">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-white/10 p-6 sm:p-8 rounded-[2.5rem] max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh] overscroll-contain"
            >
              {votingStep === 'nominate' && (
                <>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 text-center tracking-tighter uppercase">ВЫСТАВЛЕНИЕ</h3>
                  <p className="text-slate-400 text-center text-sm sm:text-base font-medium mb-8">Выберите игроков, выставленных на голосование</p>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-8">
                    {players.filter(p => p.isAlive).map(player => (
                      <button
                        key={player.id}
                        onClick={() => toggleNomination(player.id)}
                        className={`aspect-square rounded-2xl flex items-center justify-center font-black text-3xl transition-all ${
                          nominatedIds.includes(player.id)
                            ? 'bg-amber-500 text-white shadow-lg scale-105'
                            : 'bg-white/5 text-white/50 hover:bg-white/10'
                        }`}
                      >
                        {player.id}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsVotingMode(false)}
                      className="flex-1 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 active:scale-95 transition-all uppercase tracking-wider text-sm"
                    >
                      ОТМЕНА
                    </button>
                    <button 
                      onClick={() => {
                        if (nominatedIds.length === 0) {
                          setVotingStep('night');
                        } else if (nominatedIds.length === 1) {
                          setVotingStep('night'); // In classic mafia, 1 nominee means no voting
                        } else {
                          setVotes({});
                          setCurrentVotingPlayerIndex(0);
                          setVotingStep('announce');
                        }
                      }}
                      disabled={nominatedIds.length === 0}
                      className="flex-[2] py-4 bg-amber-500 text-white font-black rounded-2xl hover:bg-amber-600 active:scale-95 transition-all shadow-xl uppercase tracking-wider text-sm disabled:opacity-50"
                    >
                      {nominatedIds.length < 2 ? 'В НОЧЬ' : 'ГОЛОСОВАТЬ'}
                    </button>
                  </div>
                </>
              )}

              {votingStep === 'announce' && (
                <div className="text-center">
                  <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 uppercase tracking-tighter text-center">ОЗВУЧИВАНИЕ СПИСКА</h3>
                  <p className="text-slate-400 mb-8 text-sm font-medium text-center">Зачитайте список игроков дважды</p>
                  
                  <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 mb-8 shadow-inner">
                    <div className="space-y-4 text-left max-w-xs mx-auto">
                      {nominatedIds.map((id, index) => (
                        <div key={id} className="flex items-center gap-4 text-white">
                          <span className="text-slate-500 font-black w-6">{index + 1}.</span>
                          <span className="text-2xl font-black">Игрок №{id}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setVotes({});
                      setCurrentVotingPlayerIndex(0);
                      setVotingStep('vote');
                    }}
                    className="w-full py-5 bg-white text-black font-black rounded-2xl text-xl hover:bg-slate-200 active:scale-95 transition-all shadow-2xl uppercase tracking-wider"
                  >
                    ПЕРЕЙТИ К ГОЛОСОВАНИЮ
                  </button>
                </div>
              )}

              {votingStep === 'vote' && (
                <>
                  {(() => {
                    const currentTotalVotes = Object.values(votes).reduce((sum, v) => (sum as number) + (v as number), 0) as number;
                    const totalAlive = players.filter(p => p.isAlive).length;
                    const currentPlayerId = nominatedIds[currentVotingPlayerIndex];
                    const isLastPlayer = currentVotingPlayerIndex === nominatedIds.length - 1;
                    
                    return (
                      <div className="text-center">
                        <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 uppercase tracking-tighter">ГОЛОСОВАНИЕ</h3>
                        <div className="flex flex-col items-center mb-8">
                          <div className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">
                              Голосов: {currentTotalVotes} / {totalAlive}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 mb-8 shadow-inner">
                          <div className="text-slate-500 uppercase tracking-[0.2em] text-[10px] font-black mb-2">ГОЛОСУЕМ ЗА ИГРОКА</div>
                          <div className="text-4xl font-black text-white mb-10 drop-shadow-2xl">{players.find(p => p.id === currentPlayerId)?.name}</div>
                          
                          <div className="flex flex-col items-center gap-6">
                            <div className="flex items-center gap-4 bg-black/20 p-2 rounded-2xl border border-white/5">
                              {!isLastPlayer ? (
                                <>
                                  <button 
                                    onClick={() => handleVote(currentPlayerId, Math.max(0, (votes[currentPlayerId] || 0) - 1))}
                                    className="w-12 h-12 bg-white/5 rounded-xl text-white flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all"
                                  >
                                    <Minus className="w-5 h-5" />
                                  </button>
                                  <div className="w-12 text-center font-mono text-4xl font-black text-white">
                                    {votes[currentPlayerId] || 0}
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const newVotes = (votes[currentPlayerId] || 0) + 1;
                                      if (currentTotalVotes + 1 <= totalAlive) {
                                        handleVote(currentPlayerId, newVotes);
                                      }
                                    }}
                                    className="w-12 h-12 bg-white/5 rounded-xl text-white flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all"
                                  >
                                    <Plus className="w-5 h-5" />
                                  </button>
                                </>
                              ) : (
                                <div className="flex flex-col items-center px-4 py-2">
                                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Оставшиеся голоса</span>
                                  <div className="text-center font-mono text-5xl font-black text-amber-500">
                                    {totalAlive - (currentTotalVotes - (votes[currentPlayerId] || 0))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <button 
                              onClick={() => handleFoul(currentPlayerId)}
                              className="px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all"
                            >
                              +1 ФОЛ ИГРОКУ {currentPlayerId}
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              if (currentVotingPlayerIndex > 0) {
                                setCurrentVotingPlayerIndex(prev => prev - 1);
                              } else {
                                setVotingStep('announce');
                              }
                            }}
                            className="flex-1 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 active:scale-95 transition-all uppercase tracking-wider text-sm"
                          >
                            НАЗАД
                          </button>
                          <button 
                            onClick={() => {
                              if (!isLastPlayer) {
                                setCurrentVotingPlayerIndex(prev => prev + 1);
                              } else {
                                finishVoting();
                              }
                            }}
                            className="flex-[2] py-4 bg-white text-black font-black rounded-2xl text-lg hover:bg-slate-200 active:scale-95 transition-all shadow-2xl uppercase tracking-wider"
                          >
                            {isLastPlayer ? 'ИТОГИ' : 'СЛЕДУЮЩИЙ'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

              {votingStep === 'night' && (
                <div className="text-center">
                  <div className="w-24 h-24 bg-indigo-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl">
                    <EyeOff className="w-12 h-12 text-indigo-400" />
                  </div>
                  <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">ГОРОД ЗАСЫПАЕТ</h2>
                  <p className="text-slate-400 mb-12 max-w-xs mx-auto text-sm sm:text-base font-medium leading-relaxed">
                    Голосование завершено. Наступила ночь.
                  </p>
                  <button 
                    onClick={() => {
                      setGamePhase('night_action');
                      setDayNumber(prev => prev + 1);
                      setCurrentRoleIndex(0);
                      setNightActions({});
                      setNominatedIds([]);
                    }}
                    className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl text-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-2xl uppercase tracking-wider"
                  >
                    ПРОДОЛЖИТЬ
                  </button>
                </div>
              )}

              {votingStep === 'crash_justification' && (
                <div className="text-center">
                  <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 uppercase tracking-tighter">АВТОКАТАСТРОФА</h3>
                  <p className="text-slate-400 mb-8 text-sm font-medium">Оправдание игроков</p>
                  
                  <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 mb-8 shadow-inner">
                    <div className="text-slate-500 uppercase tracking-[0.2em] text-[10px] font-black mb-2">ГОВОРИТ ИГРОК</div>
                    <div className="text-8xl font-black text-white mb-6 drop-shadow-2xl">
                      {crashPlayerIds[crashSpeakerIndex]}
                    </div>
                    
                    <div className="text-5xl font-mono font-black text-amber-500 mb-8">
                      {formatTime(timeLeft)}
                    </div>

                    <div className="flex gap-3 justify-center">
                      <button 
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-lg ${
                          isTimerRunning ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                        }`}
                      >
                        {isTimerRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                      </button>
                      <button 
                        onClick={() => {
                          setIsTimerRunning(false);
                          setTimeLeft(30);
                        }}
                        className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all shadow-lg"
                      >
                        <RotateCcw className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      if (crashSpeakerIndex < crashPlayerIds.length - 1) {
                        setCrashSpeakerIndex(prev => prev + 1);
                        setTimeLeft(30);
                        setIsTimerRunning(false);
                      } else {
                        setVotes({});
                        setVotingStep('crash_vote');
                      }
                    }}
                    className="w-full py-5 bg-white text-black font-black rounded-2xl text-xl hover:bg-slate-200 active:scale-95 transition-all shadow-2xl uppercase tracking-wider"
                  >
                    {crashSpeakerIndex < crashPlayerIds.length - 1 ? 'СЛЕДУЮЩИЙ' : 'ГОЛОСОВАНИЕ'}
                  </button>
                </div>
              )}

              {votingStep === 'crash_vote' && (
                <>
                  {(() => {
                    const currentTotalVotes = Object.values(votes).reduce((sum, v) => (sum as number) + (v as number), 0) as number;
                    const totalAlive = players.filter(p => p.isAlive).length;
                    const votingPlayersCount = totalAlive - crashPlayerIds.length;
                    
                    return (
                      <>
                        <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 text-center tracking-tighter uppercase">ПОВТОРНОЕ ГОЛОСОВАНИЕ</h3>
                        <div className="flex flex-col items-center mb-8">
                          <p className="text-slate-400 text-center text-sm sm:text-base font-medium">Голосуют только те, кто не в аварии</p>
                          <div className="mt-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${
                              currentTotalVotes === votingPlayersCount ? 'bg-green-500' : 'bg-amber-500'
                            }`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">
                              Голосов: {currentTotalVotes} / {votingPlayersCount}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-3 mb-8">
                          {crashPlayerIds.map(id => (
                            <div key={id} className="bg-white/5 p-4 pr-6 rounded-[2.5rem] border border-white/10 flex items-center gap-5 shadow-inner">
                              <div className="w-16 h-16 bg-white text-black rounded-2xl flex items-center justify-center font-black text-xs px-2 text-center shadow-2xl shrink-0">
                                {players.find(p => p.id === id)?.name}
                              </div>
                              <div className="flex flex-col gap-1.5 flex-1">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ml-1">Игрок №{id}</span>
                                <div className="flex items-center gap-2 bg-black/20 self-start p-1 rounded-xl border border-white/5">
                                  <button 
                                    onClick={() => handleVote(id, Math.max(0, (votes[id] || 0) - 1))}
                                    className="w-9 h-9 bg-white/5 rounded-lg text-white flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <div className="w-10 text-center font-mono text-2xl font-black text-white">
                                    {votes[id] || 0}
                                  </div>
                                  <button 
                                    onClick={() => handleVote(id, (votes[id] || 0) + 1)}
                                    className="w-9 h-9 bg-white/5 rounded-lg text-white flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-3">
                          <button 
                            onClick={() => setVotingStep('crash_justification')}
                            className="flex-1 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 active:scale-95 transition-all uppercase tracking-wider text-sm"
                          >
                            НАЗАД
                          </button>
                          <button 
                            onClick={finishCrashVoting}
                            disabled={currentTotalVotes !== votingPlayersCount}
                            className="flex-[2] py-4 bg-white text-black font-black rounded-2xl text-lg hover:bg-slate-200 active:scale-95 transition-all shadow-2xl uppercase tracking-wider disabled:opacity-30 disabled:grayscale"
                          >
                            ИТОГИ
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
              {votingStep === 'result' && eliminatedPlayerIds.length > 0 && (
                <div className="text-center">
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Skull className="w-10 h-10 text-red-500" />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">ИТОГИ</h3>
                  <p className="text-slate-400 mb-8 text-sm font-medium">Город покидает игрок номер</p>
                  
                  <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/10 mb-8 shadow-inner flex flex-wrap justify-center gap-4">
                    {eliminatedPlayerIds.map(id => (
                      <div key={id} className="text-4xl font-black text-white drop-shadow-2xl">{players.find(p => p.id === id)?.name}</div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex gap-3 flex-1">
                      <button 
                        onClick={() => setVotingStep(crashPlayerIds.length > 0 ? 'crash_vote' : 'vote')}
                        className="flex-1 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 active:scale-95 transition-all uppercase tracking-wider text-xs"
                      >
                        НАЗАД
                      </button>
                      <button 
                        onClick={confirmElimination}
                        className="flex-1 py-4 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 active:scale-95 transition-all uppercase tracking-wider text-xs"
                      >
                        БЕЗ СЛОВА
                      </button>
                    </div>
                    <button 
                      onClick={startLastWord}
                      className="w-full sm:flex-[1.5] py-4 bg-white text-black font-black rounded-2xl hover:bg-slate-200 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-2 uppercase tracking-wider"
                    >
                      <Timer className="w-5 h-5" />
                      ПОСЛЕДНЕЕ СЛОВО
                    </button>
                  </div>
                </div>
              )}

              {votingStep === 'last_word' && eliminatedPlayerIds.length > 0 && (
                <div className="text-center">
                  <h3 className="text-slate-500 uppercase tracking-[0.2em] text-[10px] font-black mb-2">ПОСЛЕДНЕЕ СЛОВО</h3>
                  <h2 className="text-3xl sm:text-4xl font-black text-white mb-8 uppercase tracking-tighter">{players.find(p => p.id === eliminatedPlayerIds[eliminatedSpeakerIndex])?.name}</h2>
                  
                  <div className="relative w-40 h-40 sm:w-48 sm:h-48 mx-auto mb-12">
                    <svg className="w-full h-full transform -rotate-90 drop-shadow-2xl">
                      <circle
                        cx="50%"
                        cy="50%"
                        r="45%"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-white/10"
                      />
                      <motion.circle
                        cx="50%"
                        cy="50%"
                        r="45%"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray="283"
                        animate={{ strokeDashoffset: 283 - (283 * lastWordTime) / 30 }}
                        className="text-amber-500"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl font-black text-white tabular-nums drop-shadow-lg">
                      {lastWordTime}
                    </div>
                  </div>

                  <div className="flex gap-3 justify-center mb-12">
                    <button 
                      onClick={() => setIsLastWordRunning(!isLastWordRunning)}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-xl ${
                        isLastWordRunning ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                      }`}
                    >
                      {isLastWordRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                    </button>
                    <button 
                      onClick={() => {
                        setIsLastWordRunning(false);
                        setLastWordTime(30);
                      }}
                      className="w-16 h-16 bg-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all shadow-lg"
                    >
                      <RotateCcw className="w-6 h-6" />
                    </button>
                  </div>

                  <button 
                    onClick={nextLastWord}
                    className="w-full py-5 bg-white text-black font-black rounded-2xl text-xl hover:bg-slate-200 active:scale-95 transition-all shadow-2xl uppercase tracking-wider"
                  >
                    {eliminatedSpeakerIndex < eliminatedPlayerIds.length - 1 ? 'СЛЕДУЮЩИЙ' : 'ЗАВЕРШИТЬ'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {gamePhase !== 'voting' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {players.map((player) => (
            <motion.div 
              key={player.id}
              layout
              className={`relative p-4 sm:p-5 rounded-3xl border transition-all duration-300 shadow-lg ${
                !player.isAlive 
                  ? 'bg-black/40 border-white/5 grayscale opacity-50' 
                  : nominatedIds.includes(player.id)
                    ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shadow-lg transition-colors ${!player.isAlive ? 'bg-slate-800 text-slate-500' : nominatedIds.includes(player.id) ? 'bg-amber-500 text-white' : 'bg-white text-black'}`}>
                    {player.id}
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm sm:text-base ${!player.isAlive ? 'text-slate-500 line-through' : 'text-white'}`}>
                      {player.name}
                    </h4>
                    <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${!player.isAlive ? 'text-red-500/50' : nominatedIds.includes(player.id) ? 'text-amber-500' : 'text-green-500'}`}>
                      {player.isAlive ? (nominatedIds.includes(player.id) ? 'Выставлен' : 'В игре') : 'Выбыл'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {player.isAlive && (
                    <button 
                      onClick={() => toggleNomination(player.id)}
                      className={`p-2.5 rounded-xl transition-all active:scale-90 ${nominatedIds.includes(player.id) ? 'text-amber-500 bg-amber-500/10' : 'text-slate-500 bg-white/5 hover:bg-white/10'}`}
                      title={nominatedIds.includes(player.id) ? "Снять с голосования" : "Выставить на голосование"}
                    >
                      {nominatedIds.includes(player.id) ? <UserMinus className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                    </button>
                  )}
                  <button 
                    onClick={() => toggleEliminatePlayer(player.id)}
                    className={`p-2.5 rounded-xl transition-all active:scale-90 ${player.isAlive ? 'text-slate-500 bg-white/5 hover:bg-red-500/20 hover:text-red-500' : 'text-green-500 bg-green-500/10 hover:bg-green-500/20'}`}
                    title={player.isAlive ? "Исключить" : "Вернуть в игру"}
                  >
                    {player.isAlive ? <Skull className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className={`mt-4 p-3.5 rounded-2xl flex items-center gap-3 transition-all duration-500 shadow-inner ${showRolesToModerator ? player.role.color : 'bg-white/5 border border-white/5'}`}>
                <div className="text-white drop-shadow-md">
                  {showRolesToModerator ? React.cloneElement(player.role.icon as React.ReactElement, { className: 'w-5 h-5' }) : <Shield className="w-5 h-5 opacity-10" />}
                </div>
                <span className="text-white font-black text-[10px] sm:text-xs uppercase tracking-widest">
                  {showRolesToModerator ? player.role.name : '••••••••'}
                </span>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(f => (
                    <div 
                      key={f} 
                      className={`w-2 h-2 rounded-full ${player.fouls >= f ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-white/10'}`} 
                    />
                  ))}
                </div>
                {player.isAlive && (
                  <button 
                    onClick={() => handleFoul(player.id)}
                    className="text-[10px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors"
                  >
                    +1 ФОЛ
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!players.some(p => p.isAlive) && (
        <div className="mt-12 text-center p-12 bg-white/5 rounded-3xl border border-dashed border-white/20">
          <p className="text-slate-500">Все игроки выбыли. Игра окончена.</p>
          <button onClick={resetGame} className="mt-4 text-white font-bold underline">Начать заново</button>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md text-center">
            <h3 className="text-2xl font-black text-white mb-4">Завершить игру?</h3>
            <p className="text-slate-400 mb-8">Текущий прогресс будет потерян.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowExitConfirmation(false)}
                className="flex-1 py-4 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-all"
              >
                ОТМЕНА
              </button>
              <button 
                onClick={() => {
                  setShowExitConfirmation(false);
                  resetGame();
                }}
                className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all"
              >
                ЗАВЕРШИТЬ
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

  const renderProfile = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto min-h-[100dvh] p-6 flex flex-col items-center justify-center text-center"
    >
      <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 shadow-xl border border-indigo-500/30">
        <User className="w-12 h-12 text-indigo-400" />
      </div>
      
      <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Личный кабинет</h2>
      <p className="text-slate-400 mb-8 font-medium">Добро пожаловать, {user?.username}!</p>

      <div className="w-full bg-white/5 rounded-[2rem] border border-white/10 p-8 mb-8 text-left space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 text-sm font-bold uppercase tracking-wider">Ваш ID:</span>
          <span className="text-white font-mono text-xl">#{user?.id}</span>
        </div>
        <div className="h-px bg-white/10 w-full" />
        <div className="flex justify-between items-center">
          <span className="text-slate-500 text-sm font-bold uppercase tracking-wider">Имя:</span>
          <span className="text-white font-bold">{user?.username}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 w-full">
        <button 
          onClick={() => setStage('home')}
          className="w-full py-5 bg-white text-black font-black rounded-2xl text-lg hover:bg-slate-200 active:scale-[0.98] transition-all shadow-2xl uppercase tracking-wider flex items-center justify-center gap-3"
        >
          <Home className="w-6 h-6" /> В ГЛАВНОЕ МЕНЮ
        </button>
        
        <button 
          onClick={() => {
            setUser(null);
            setStage('home');
          }}
          className="w-full py-5 bg-red-500/10 text-red-500 font-black rounded-2xl text-lg hover:bg-red-500/20 active:scale-[0.98] transition-all uppercase tracking-wider border border-red-500/20"
        >
          ВЫЙТИ ИЗ АККАУНТА
        </button>
      </div>
    </motion.div>
  );

  if (!user) {
    return <Auth onLogin={(u) => {
      setUser(u);
      setStage('profile');
    }} />;
  }

  if (showFriends) {
    return <Friends user={user} onBack={() => setShowFriends(false)} />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-slate-200 font-sans selection:bg-white selection:text-black select-none sm:select-auto">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full"></div>
      </div>

      <main className="relative z-10">
        {stage === 'home' && renderHome()}
        {stage === 'setup' && renderSetup()}
        {stage === 'player_names' && renderPlayerNames()}
        {stage === 'distribution' && renderDistribution()}
        {stage === 'moderator_start' && renderModeratorStart()}
        {stage === 'admin_pin' && renderAdminPin()}
        {stage === 'moderator_dashboard' && renderModeratorDashboard()}
        {stage === 'profile' && renderProfile()}
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
