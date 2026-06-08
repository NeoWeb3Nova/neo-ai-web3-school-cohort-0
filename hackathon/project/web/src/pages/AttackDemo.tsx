import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldAlert,
  Play,
  CheckCircle,
  Zap,
  ChevronRight,
  ShieldCheck,
  Terminal,
  Crosshair,
  BadgeDollarSign,
  Ban,
  Flame,
  KeyRound,
} from 'lucide-react';
import { ATTACK_SCENARIOS, INITIAL_CARDS } from '../data/mockData';

const SCENARIO_ICONS: Record<string, React.ElementType> = {
  A1: Crosshair,
  A2: BadgeDollarSign,
  A3: Ban,
  A4: Flame,
  A5: KeyRound,
};

interface AttackResult {
  scenarioId: string;
  status: 'running' | 'blocked' | 'done';
  logs: string[];
  finalReason: string;
}

export default function AttackDemo() {
  const { t } = useTranslation();
  const [results, setResults] = useState<Record<string, AttackResult>>({});
  const [runningAll, setRunningAll] = useState(false);

  const runScenario = (scenarioId: string, delay = 0) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setResults((prev) => ({
          ...prev,
          [scenarioId]: {
            scenarioId,
            status: 'running',
            logs: [t('attack.initializing')],
            finalReason: '',
          },
        }));

        const scenario = ATTACK_SCENARIOS.find((s) => s.id === scenarioId);
        if (!scenario) return resolve();

        const logs: string[] = [
          `[${scenario.id}] ${scenario.name} ${t('common.run').toLowerCase()}`,
          `${t('attack.target')}: ${INITIAL_CARDS[0].agent_name} (${INITIAL_CARDS[0].card_id})`,
          `${t('attack.trigger')}:"${scenario.trigger}"`,
          t('attack.stage1'),
        ];

        const addLog = (log: string, stepDelay: number) => {
          setTimeout(() => {
            logs.push(log);
            setResults((prev) => ({
              ...prev,
              [scenarioId]: { ...prev[scenarioId], logs: [...logs] },
            }));
          }, stepDelay);
        };

        addLog(t('attack.stage2'), 600);
        addLog(` \u2717 ${scenario.policyViolation}`, 1200);
        addLog(t('attack.stage3'), 1800);
        addLog(t('attack.resultDenied'), 2400);

        setTimeout(() => {
          setResults((prev) => ({
            ...prev,
            [scenarioId]: {
              scenarioId,
              status: 'blocked',
              logs: [...logs, t('attack.attackIntercepted')],
              finalReason: scenario.policyViolation,
            },
          }));
          resolve();
        }, 3000);
      }, delay);
    });
  };

  const runAllScenarios = async () => {
    setRunningAll(true);
    setResults({});
    for (let i = 0; i < ATTACK_SCENARIOS.length; i++) {
      await runScenario(ATTACK_SCENARIOS[i].id, i * 4000);
    }
    setRunningAll(false);
  };

  const clearResults = () => {
    setResults({});
    setRunningAll(false);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="glass-card rounded-im p-4 lg:p-5 border-accent-coral/20 transition-all duration-200 hover:border-accent-coral/40">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-im bg-accent-coral/10 flex items-center justify-center border border-accent-coral/20 shrink-0">
              <ShieldAlert className="w-6 h-6 text-accent-coral" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary tracking-tight font-display">
                {t('attack.title')}
              </h2>
              <p className="text-sm text-text-secondary mt-0.5">
                {t('attack.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={clearResults}
              className="px-3 py-2 rounded-im text-xs font-medium btn-ghost"
            >
              {t('common.clear')}
            </button>
            <button
              onClick={runAllScenarios}
              disabled={runningAll}
              className="flex items-center gap-2 px-4 py-2 rounded-im text-sm btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {runningAll ? (
                <Zap className="w-4 h-4 animate-pulse" strokeWidth={1.5} />
              ) : (
                <Play className="w-4 h-4" strokeWidth={1.5} />
              )}
              {runningAll ? t('attack.runningAll') : t('attack.runAllScenarios')}
            </button>
          </div>
        </div>

        {/* Defense Stats */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-border-default">
          <div className="text-center">
            <p className="text-xl lg:text-2xl font-bold text-accent-coral tabular-nums">5</p>
            <p className="text-xs text-text-secondary mt-0.5">{t('attack.attackVectors')}</p>
          </div>
          <div className="text-center">
            <p className="text-xl lg:text-2xl font-bold text-accent-patina tabular-nums">100%</p>
            <p className="text-xs text-text-secondary mt-0.5">{t('attack.blockRate')}</p>
          </div>
          <div className="text-center">
            <p className="text-xl lg:text-2xl font-bold text-accent-slate tabular-nums">0 {t('common.usdc')}</p>
            <p className="text-xs text-text-secondary mt-0.5">{t('attack.fundsLost')}</p>
          </div>
        </div>
      </div>

      {/* Scenarios */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-4">
        {ATTACK_SCENARIOS.map((scenario) => {
          const result = results[scenario.id];
          const isRunning = result?.status === 'running';
          const isBlocked = result?.status === 'blocked';
          const IconComponent = SCENARIO_ICONS[scenario.id] || ShieldAlert;

          return (
            <div
              key={scenario.id}
              className={`glass-card rounded-im overflow-hidden transition-all duration-300 ${
                isBlocked
                  ? 'border-accent-patina/30'
                  : isRunning
                  ? 'border-accent-amber/30'
                  : 'hover:border-border-hover'
              }`}
            >
              {/* Scenario Header */}
              <div className="p-4 lg:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-im bg-accent-coral/10 flex items-center justify-center border border-accent-coral/15 shrink-0">
                      <IconComponent className="w-5 h-5 text-accent-coral" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-accent-coral bg-accent-coral/10 px-1.5 py-0.5 rounded shrink-0">
                          {scenario.id}
                        </span>
                        <h3 className="text-sm font-semibold text-text-primary truncate">
                          {scenario.name}
                        </h3>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                        {scenario.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => runScenario(scenario.id)}
                    disabled={isRunning || runningAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-primary border border-border-default text-text-secondary rounded-im text-xs font-medium hover:bg-bg-hover hover:text-text-primary disabled:opacity-50 transition-all shrink-0"
                  >
                    {isRunning ? (
                      <Zap className="w-3.5 h-3.5 text-accent-amber animate-pulse" strokeWidth={1.5} />
                    ) : (
                      <Play className="w-3.5 h-3.5" strokeWidth={1.5} />
                    )}
                    {isRunning ? t('common.processing') : t('common.run')}
                  </button>
                </div>

                {/* Trigger Badge */}
                <div className="mt-3 flex items-center gap-2 overflow-hidden">
                  <Terminal className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={1.5} />
                  <code className="text-[11px] font-mono text-accent-amber bg-accent-amber/10 px-2 py-0.5 rounded border border-accent-amber/15 truncate">
                    {scenario.trigger}
                  </code>
                </div>

                {/* Expected Outcome */}
                <div className="mt-2 flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={2} />
                  <span className="text-xs text-text-muted truncate">
                    {t('attack.expected')}:{' '}
                    <span className="text-accent-coral font-medium">{scenario.expectedResult}</span>
                    {' — '}
                    {scenario.policyViolation}
                  </span>
                </div>
              </div>

              {/* Terminal Output */}
              {result && (
                <div className="border-t border-border-default p-3 lg:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
                    <span className="text-[10px] font-mono text-text-muted">{t('attack.simulationLog')}</span>
                    {isBlocked && (
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-accent-patina font-semibold">
                        <ShieldCheck className="w-3 h-3" strokeWidth={2} />
                        {t('common.blocked')}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    {result.logs.map((log, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 ${
                          log.includes('\u2717')
                            ? 'text-accent-coral'
                            : log.includes('DENIED') || log.includes(t('common.blocked'))
                            ? 'text-accent-coral font-semibold'
                            : log.includes('safe') || log.includes(t('attack.attackIntercepted'))
                            ? 'text-accent-patina font-semibold'
                            : 'text-text-secondary'
                        }`}
                      >
                        <span className="text-text-muted shrink-0 select-none">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="break-all">{log}</span>
                      </div>
                    ))}
                    {isRunning && (
                      <div className="flex items-center gap-2 text-accent-slate">
                        <span className="text-text-muted select-none">{String(result.logs.length + 1).padStart(2, '0')}</span>
                        <span className="animate-pulse">{t('common.processing')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Final Result Banner */}
              {isBlocked && (
                <div className="px-4 lg:px-5 py-3 bg-accent-patina/5 border-t border-accent-patina/20 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent-patina shrink-0" strokeWidth={2} />
                  <span className="text-xs text-accent-patina font-medium">
                    {t('attack.attackBlocked')} — {result.finalReason}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Banner */}
      {Object.values(results).filter((r) => r.status === 'blocked').length === 5 && (
        <div className="glass-card rounded-im p-5 lg:p-6 border-accent-patina/30 bg-accent-patina/5 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-im bg-accent-patina/10 flex items-center justify-center mx-auto mb-3 border border-accent-patina/20">
            <ShieldCheck className="w-6 h-6 text-accent-patina" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-accent-patina">
            {t('attack.allBlockedTitle')}
          </h3>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">
            {t('attack.allBlockedDesc')}
          </p>
        </div>
      )}
    </div>
  );
}
