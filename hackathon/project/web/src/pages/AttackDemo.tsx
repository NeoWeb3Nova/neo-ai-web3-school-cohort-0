import { useState } from 'react';
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

// Map scenario IDs to Lucide icons (replacing emojis)
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
            logs: ['Initializing attack simulation...'],
            finalReason: '',
          },
        }));

        const scenario = ATTACK_SCENARIOS.find((s) => s.id === scenarioId);
        if (!scenario) return resolve();

        const logs: string[] = [
          `[${scenario.id}] ${scenario.name} started`,
          `Target: ${INITIAL_CARDS[0].agent_name} (${INITIAL_CARDS[0].card_id})`,
          `Trigger: "${scenario.trigger}"`,
          'Sending payment request to CAW Policy Engine...',
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

        addLog('Stage 1: Permission Check — VALID', 600);
        addLog('Stage 2: Policy Rule Evaluation...', 1200);
        addLog(`  ✗ ${scenario.policyViolation}`, 1800);
        addLog('Stage 3: Anomaly Detection — BLOCKED', 2400);
        addLog('Result: DENIED before MPC signing', 3000);

        setTimeout(() => {
          setResults((prev) => ({
            ...prev,
            [scenarioId]: {
              scenarioId,
              status: 'blocked',
              logs: [...logs, 'Attack intercepted. Funds safe.'],
              finalReason: scenario.policyViolation,
            },
          }));
          resolve();
        }, 3500);
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card rounded-xl p-5 border-accent-red/20 transition-all duration-200 hover:border-accent-red/40">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-red/10 flex items-center justify-center border border-accent-red/20">
              <ShieldAlert className="w-6 h-6 text-accent-red" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary tracking-tight">
                Threat Simulation Center
              </h2>
              <p className="text-sm text-text-secondary mt-0.5">
                Verify CAW Policy Engine defense against 5 real-world attack vectors
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clearResults}
              className="px-3 py-2 border border-border-default text-text-secondary rounded-lg text-xs font-medium hover:bg-bg-hover hover:text-text-primary transition-all"
            >
              Clear
            </button>
            <button
              onClick={runAllScenarios}
              disabled={runningAll}
              className="flex items-center gap-2 px-4 py-2 bg-accent-red text-white rounded-lg text-sm font-semibold hover:bg-accent-red/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent-red/10"
            >
              {runningAll ? (
                <Zap className="w-4 h-4 animate-pulse" strokeWidth={1.5} />
              ) : (
                <Play className="w-4 h-4" strokeWidth={1.5} />
              )}
              {runningAll ? 'Running All...' : 'Run All Scenarios'}
            </button>
          </div>
        </div>

        {/* Defense Stats */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-border-default">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-red tabular-nums">5</p>
            <p className="text-xs text-text-secondary mt-0.5">Attack Vectors</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-green tabular-nums">100%</p>
            <p className="text-xs text-text-secondary mt-0.5">Block Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-blue tabular-nums">0 USDC</p>
            <p className="text-xs text-text-secondary mt-0.5">Funds Lost</p>
          </div>
        </div>
      </div>

      {/* Scenarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ATTACK_SCENARIOS.map((scenario) => {
          const result = results[scenario.id];
          const isRunning = result?.status === 'running';
          const isBlocked = result?.status === 'blocked';
          const IconComponent = SCENARIO_ICONS[scenario.id] || ShieldAlert;

          return (
            <div
              key={scenario.id}
              className={`glass-card rounded-xl overflow-hidden transition-all duration-300 ${
                isBlocked
                  ? 'border-accent-green/30'
                  : isRunning
                  ? 'border-accent-orange/30'
                  : 'hover:border-border-hover'
              }`}
            >
              {/* Scenario Header */}
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-red/10 flex items-center justify-center border border-accent-red/15">
                      <IconComponent className="w-5 h-5 text-accent-red" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-accent-red bg-accent-red/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {scenario.id}
                        </span>
                        <h3 className="text-sm font-semibold text-text-primary">
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-primary border border-border-default text-text-secondary rounded-lg text-xs font-medium hover:bg-bg-hover hover:text-text-primary disabled:opacity-50 transition-all shrink-0"
                  >
                    {isRunning ? (
                      <Zap className="w-3.5 h-3.5 text-accent-orange animate-pulse" strokeWidth={1.5} />
                    ) : (
                      <Play className="w-3.5 h-3.5" strokeWidth={1.5} />
                    )}
                    {isRunning ? 'Running' : 'Run'}
                  </button>
                </div>

                {/* Trigger Badge */}
                <div className="mt-3 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
                  <code className="text-[11px] font-mono text-accent-orange bg-accent-orange/10 px-2 py-0.5 rounded border border-accent-orange/15">
                    {scenario.trigger}
                  </code>
                </div>

                {/* Expected Outcome */}
                <div className="mt-2 flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted" strokeWidth={2} />
                  <span className="text-xs text-text-muted">
                    Expected:{' '}
                    <span className="text-accent-red font-medium">{scenario.expectedResult}</span>
                    {' — '}
                    {scenario.policyViolation}
                  </span>
                </div>
              </div>

              {/* Terminal Output */}
              {result && (
                <div className="border-t border-border-default bg-bg-primary/80 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
                    <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                      Simulation Log
                    </span>
                    {isBlocked && (
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-accent-green font-bold uppercase tracking-wider">
                        <ShieldCheck className="w-3 h-3" strokeWidth={2} />
                        BLOCKED
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    {result.logs.map((log, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 ${
                          log.includes('\u2717')
                            ? 'text-accent-red'
                            : log.includes('DENIED') || log.includes('BLOCKED')
                            ? 'text-accent-red font-semibold'
                            : log.includes('safe')
                            ? 'text-accent-green font-semibold'
                            : 'text-text-secondary'
                        }`}
                      >
                        <span className="text-text-muted shrink-0 select-none">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span>{log}</span>
                      </div>
                    ))}
                    {isRunning && (
                      <div className="flex items-center gap-2 text-accent-blue">
                        <span className="text-text-muted select-none">{String(result.logs.length + 1).padStart(2, '0')}</span>
                        <span className="animate-pulse">Processing...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Final Result Banner */}
              {isBlocked && (
                <div className="px-5 py-3 bg-accent-green/5 border-t border-accent-green/20 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent-green" strokeWidth={2} />
                  <span className="text-xs text-accent-green font-medium">
                    Attack blocked — {result.finalReason}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Banner */}
      {Object.values(results).filter((r) => r.status === 'blocked').length === 5 && (
        <div className="glass-card rounded-xl p-6 border-accent-green/30 bg-accent-green/5 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-accent-green/10 flex items-center justify-center mx-auto mb-3 border border-accent-green/20">
            <ShieldCheck className="w-6 h-6 text-accent-green" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-accent-green">
            All 5 Attack Vectors Blocked
          </h3>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">
            CAW Policy Engine successfully intercepted every attack before MPC signing.
            <br />
            Zero funds compromised.
          </p>
        </div>
      )}
    </div>
  );
}
