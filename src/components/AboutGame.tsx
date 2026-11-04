import React from "react";
import { 
  Rocket, 
  ArrowLeft, 
  Compass, 
  Gamepad2, 
  Cpu, 
  Cloud, 
  HelpCircle, 
  Zap, 
  ShieldAlert, 
  Target,
  Swords, 
  Keyboard 
} from "lucide-react";
import { Language } from "../utils/translations";

interface AboutGameProps {
  onBack: () => void;
  lang: Language;
}

export function AboutGame({ onBack, lang }: AboutGameProps) {
  const isPt = lang === "pt";
  const isEs = lang === "es";
  const isZh = lang === "zh";

  // Content dictionaries
  const content = {
    title: isPt ? "Manual do Piloto & Detalhes do Jogo" : isEs ? "Manual del Piloto e Información" : isZh ? "飞行员手册与游戏指南" : "Pilot's Manual & Game Guide",
    subtitle: isPt ? "Tudo sobre o universo procedural do StarshipX Battle" : isEs ? "Todo sobre el universo procedimental de StarshipX Battle" : isZh ? "关于 StarshipX Battle 渐变航宇的一切" : "Everything about the procedural universe of StarshipX Battle",
    backBtn: isPt ? "Voltar ao Hangar" : isEs ? "Volver al Hangar" : isZh ? "返回机库" : "Back to Hangar",
    
    sectionWelcome: isPt ? "Sobre o Jogo" : isEs ? "Sobre el Juego" : isZh ? "关于游戏" : "About the Game",
    welcomeDesc: isPt 
      ? "StarshipX Battle é um simulador de voo e batalha espacial 3D retro-futurista, onde naves espaciais são construídas de forma procedural usando strings de texto (Seeds/Sementes)! Cada letra e combinação de caracteres dita dinamicamente a geometria, cores, armamento e desempenho de combate da nave."
      : isEs 
      ? "¡StarshipX Battle é um simulador de combate e voo espacial 3D retro-futurista, onde as naves espaciais se geram de maneira procedimental usando sementes de texto (Seeds)! Cada letra e combinação dita dinamicamente sua geometria, cores, asas e rendimento em batalha."
      : isZh
      ? "StarshipX Battle 是一款复古未来主义的 3D 太空飞行与战斗模拟游戏。在这里，所有太空飞船都是使用文本字符（种子）渐变生成的！每一个字母与字符组合都动态决定了飞船的几何形状、模块、颜色和作战性能。"
      : "StarshipX Battle is a retro-futuristic 3D space flight and battle simulator where starships are procedurally engineered from text strings (Seeds)! Every character and combination dynamically dictates your spaceship geometry, color palettes, modules, and combat capabilities.",

    sectionTech: isPt ? "Geometria Procedural" : isEs ? "Geometría Procedimental" : isZh ? "程序化几何结构" : "Procedural Geometry",
    techDesc: isPt 
      ? "O motor do jogo decodifica o código da Seed para posicionar asas, propulsores, canhões e cabines. Além do visual único, o tamanho e tipo de módulo modificam os atributos reais do veículo:"
      : isEs 
      ? "El motor decodifica la Semilla para posicionar alas, propulsores y cañones. Además del aspecto visual, cada módulo altera os atributos reais do veículo:"
      : isZh
      ? "游戏引擎解码种子代码来自动部署机翼、推进器、加农炮与舱室。除了独特的视觉外观，模块的尺度和类型还会直接修改飞船的实际属性："
      : "The engine decodes your ship seed code to position wings, thrusters, and cannons. Aside from visual distinctiveness, the modules directly scale the spacecraft stats:",

    statsList: [
      {
        title: isPt ? "Blindagem (Max HP)" : isEs ? "Blindaje (Max HP)" : isZh ? "装甲强度 (Max HP)" : "Armor (Max HP)",
        desc: isPt ? "Calculado a partir do volume geral dos blocos. Naves robustas suportam mais lasers." : isEs ? "Calculado a partir de la masa y volumen. Naves grandes soportan más ráfagas de láser." : isZh ? "根据模块的总体积计算。结构庞大的飞船能承受更多雷射打击。" : "Calculated from the overall volume of modules. Bulky ships can take more laser fire."
      },
      {
        title: isPt ? "Agilidade & Curvas" : isEs ? "Agilidad y Giro" : isZh ? "机动性与旋转" : "Agility & Turn Speed",
        desc: isPt ? "Ditado pelo número de propulsores laterais e asas aerodinâmicas instaladas." : isEs ? "Involucra alerones y propulsores laterales para maniobras rápidas en espiral." : isZh ? "由安装的侧向推进器和气动翼的数量决定，支持快速旋转。" : "Governed by the count of lateral vernier thrusters and aerodynamic wings."
      },
      {
        title: isPt ? "Velocidade & Impulso" : isEs ? "Velocidad y Empuje" : isZh ? "速度与推进" : "Engine Output & Speed",
        desc: isPt ? "Propulsores traseiros grandes alimentam o turbo-thrust para fugas interestelares." : isEs ? "Grandes propulsores traseros aceleran la nave por encima de las órbitas." : isZh ? "大型尾部推进器为星际逃生和追击提供更长的涡轮增压时间。" : "Large rear thrusters feed your turbo-thrust capacity for high-speed intercepts."
      }
    ],

    sectionControls: isPt ? "Controles da Nave" : isEs ? "Controles de Vuelo" : isZh ? "飞船控制指令" : "Flight Controls",
    controlsDesc: isPt 
      ? "Você pode pilotar usando Teclado, Controles de Toque (Celular) ou um Controle de videogame USB/Bluetooth (Gamepad mapeado automaticamente)."
      : isEs 
      ? "Pilota usando el teclado del ordenador, controles táctiles en móviles o mandos USB/Bluetooth autodetectados."
      : isZh
      ? "您可以使用键盘、触屏（行动装置）或 USB/蓝牙手柄（系统自动配置）来进行驾驶导航。"
      : "Navigate using Keyboard controls, Mobile touch overlays, or any standard USB/Bluetooth controller (Gamepad auto-detected).",

    controlKeys: [
      { key: "W / S", desc: isPt ? "Gira o nariz para baixo / cima (Pitch/Bicar)" : isEs ? "Inclinación del morro abajo / arriba (Pitch)" : isZh ? "机头向下 / 向上偏转 (俯仰)" : "Pitch down / up (Tilt nose)" },
      { key: "A / D", desc: isPt ? "Gira para esquerda / direita (Yaw/Guinada)" : isEs ? "Giro lateral izquierda / derecha (Yaw)" : isZh ? "水平向左 / 向右转向 (偏航)" : "Yaw left / right (Steer lateral)" },
      { key: "Q / E", desc: isPt ? "Gira no próprio eixo (Roll/Inclinação)" : isEs ? "Giro sobre el eje longitudinal (Roll)" : isZh ? "横向沿轴旋转 (翻滚)" : "Roll left / right (Roll wings)" },
      { key: "Shift", desc: isPt ? "Ativa Hiper-propulsão (Super Thruster)" : isEs ? "Hiperpropulsión (Turbo)" : isZh ? "超载引擎推进 (Turbo)" : "Activate Super Thrusters (Turbo Boost)" },
      { key: "Ctrl", desc: isPt ? "Ativa Freio de Manobra (Frenagem rápida)" : isEs ? "Freno orbital (Frenado de emergencia)" : isZh ? "启用轨道减速器 (阻尼刹车)" : "Engage Retro-brakes (De-accelerate)" },
      { key: "Space", desc: isPt ? "Dispara Canhões de Laser (Arma Primária)" : isEs ? "Fuego Láser principal" : isZh ? "发射激光炮 (主武器)" : "Fire Primary Plasma-Laser Cannons" },
      { key: "F / Click", desc: isPt ? "Dispara Míssil Seletivo Guiado (Dano Crítico)" : isEs ? "Dispara Misil teledirigido (Daño masivo)" : isZh ? "发射追踪导弹 (引发暴击)" : "Launch Guided Homing Missile (Heavy Damage)" }
    ],

    combatTipsTitle: isPt ? "Dicas de Combate & Mecânicas" : isEs ? "Consejos de Combate" : isZh ? "空战技巧与竞技秘籍" : "Tactical Combat Tips",
    tips: [
      {
        title: isPt ? "Navegue ao redor de Planetas" : isEs ? "Estrategia Orbital" : isZh ? "利用天体掩护" : "Stellar Gravity & Cover",
        desc: isPt 
          ? "Os astros rochosos do sistema solar funcionam como barreiras físicas. Use planetas para bloquear disparos inimigos ou escapar de mísseis guiados!"
          : isEs
          ? "Usa los globos planetarios para cubrirte de misiles balísticos automáticos o romper el ángulo de visión rápido de los pilotos hostiles."
          : isZh
          ? "太阳系中的庞大星球拥有实体物理碰撞。利用行星体来躲避敌方的高速雷射或是摆脱追踪导弹！"
          : "The large planetary spheres in the solar system block both laser fire and guided missiles. Loop around planets to break line of sight and dodge lock-ons."
      },
      {
        title: isPt ? "Mísseis Recarregam Lentamente" : isEs ? "Misiles Inteligentes" : isZh ? "导弹装填机制" : "Missile Cooldowns",
        desc: isPt 
          ? "Seu míssil guiado persegue o alvo mais próximo automaticamente, mas requer alguns segundos de recarga. Dispare com sabedoria!"
          : isEs
          ? "El lanzador busca automáticamente la amenaza más cercana. Tiene un lapso de carga elevado, de modo que calcula el pulso de disparo."
          : isZh
          ? "导弹会自动锁定并追踪最接近的飞船，但是装填冷却时间较长。紧盯对手进入射程后，射出致命一击！"
          : "Homing missiles tracking the nearest opponent pose high threat but have a long reload cycle. Wait for the perfect visual alignment before firing."
      },
      {
        title: isPt ? "Editar Nave e Características" : isEs ? "Personalización Dinámica" : isZh ? "定制部件微调" : "Customize & Fine-Tune",
        desc: isPt 
          ? "No Hangar, você pode clicar em qualquer módulo da nave 3D! Altere o tipo da forma (Cone, Cilindro, Cubo), rotacione e escale para aumentar peso, beleza ou asas."
          : isEs
          ? "¡En el hangar puedes pulsar en cada sección de la maqueta! Cambia el escalado o rotación para variar el volumen e influir las especificaciones."
          : isZh
          ? "在机库中，您可以直接用鼠标点选飞船的任何 3D 模块！编辑它的几何类型、进行旋转与缩放来平衡重力结构、提升观赏性或调节战斗属性。"
          : "In the Hangar, click directly on any module of your 3D starship! Transform forms (Cone, Cylinder, Box), scale and rotate to balance visual layout and performance."
      },
      {
        title: isPt ? "Registro e Sincronização em Nuvem" : isEs ? "Registro y Sincronización" : isZh ? "云端同步与飞行员档案" : "Cloud Sync & Pilot Profile",
        desc: isPt 
          ? "Faça login com sua conta Google para salvar sua frota de naves personalizadas, manter seu codinome de piloto e disputar posições no Ranking Global em tempo real!"
          : isEs
          ? "Inicia sesión con tu cuenta de Google para guardar tu flotilla de naves espaciales, conservar tu indicativo de piloto y competir en la clasificación mundial."
          : isZh
          ? "通过 Google 帐号登入，即可随时同步您的专属战舰编队，保留您的飞行员代号并在全球排行榜中实时竞技！"
          : "Sign in with your Google account to automatically synchronize your fleet, retain your pilot callsign, and compete live on the Global leaderboard."
      }
    ]
  };

  return (
    <div className="flex flex-col h-full bg-[#070a13] text-white p-6 md:p-8 overflow-y-auto font-sans">
      <div className="max-w-4xl mx-auto w-full">
        {/* Back navigation */}
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-emerald-400 hover:text-emerald-300 font-semibold text-sm rounded-full transition-all border border-emerald-500/10 cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{content.backBtn}</span>
        </button>

        {/* Hero Title */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8 border-b border-white/5 pb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <HelpCircle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-blue-400 to-indigo-400">
              {content.title}
            </h1>
            <p className="text-sm text-gray-400 font-medium">
              {content.subtitle}
            </p>
          </div>
        </div>

        {/* Info Grid (Bento columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Welcome Card */}
          <div className="md:col-span-2 p-6 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-4 relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              {content.sectionWelcome}
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed font-sans font-light">
              {content.welcomeDesc}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-mono font-bold uppercase">
                WebGL 3D
              </span>
              <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-1 rounded font-mono font-bold uppercase">
                Socket.IO Realtime
              </span>
              <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-1 rounded font-mono font-bold uppercase">
                Procedural Seeds
              </span>
            </div>
          </div>

          {/* Seed Tech Card */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3 backdrop-blur-md">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              {content.sectionTech}
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              {content.techDesc}
            </p>
            <div className="w-full h-px bg-white/10 my-1" />
            <ul className="space-y-2 text-xs">
              {content.statsList.map((st, idx) => (
                <li key={idx} className="flex flex-col">
                  <span className="font-semibold text-emerald-400">{st.title}</span>
                  <span className="text-[11px] text-gray-400 mt-0.5">{st.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Flight controls visual layout */}
        <div className="p-6 bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
            <Keyboard className="w-5 h-5 text-emerald-400" />
            {content.sectionControls}
          </h2>
          <p className="text-sm text-gray-400 mb-6 max-w-2xl font-sans">
            {content.controlsDesc}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.controlKeys.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-4 p-3 bg-black/40 hover:bg-black/60 rounded-xl border border-white/5 hover:border-white/10 transition-colors shadow-sm"
              >
                <div className="min-w-16 h-8 bg-zinc-900 border border-white/20 hover:border-emerald-400/30 rounded-lg flex items-center justify-center shadow-inner shrink-0 font-mono text-[11px] font-extrabold text-emerald-400 tracking-wider">
                  {item.key}
                </div>
                <span className="text-xs text-gray-300 font-sans font-medium">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Combat Tips section cards */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
            <Gamepad2 className="w-5 h-5 text-blue-400" />
            {content.combatTipsTitle}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {content.tips.map((tip, idx) => (
              <div 
                key={idx} 
                className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-zinc-700 hover:bg-gradient-to-tr from-white/5 to-zinc-900/10 transition-all flex gap-4"
              >
                <div className="mt-1 p-2 h-10 w-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-white/5">
                  {idx === 0 && <Compass className="w-5 h-5 text-emerald-400" />}
                  {idx === 1 && <Zap className="w-5 h-5 text-yellow-400" />}
                  {idx === 2 && <Cpu className="w-5 h-5 text-blue-400" />}
                  {idx === 3 && <Cloud className="w-5 h-5 text-purple-400" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1.5">{tip.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom design banner */}
        <div className="mt-12 pt-8 border-t border-white/10 text-center flex flex-col items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">
            StarshipX Spatial Flight Engine v4.0 • Compiled with R3F
          </span>
          <button 
            onClick={onBack}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors mt-2"
          >
            ← {isPt ? "Começar Simulação" : isEs ? "Entrar al Combate" : "Ready to launch"}
          </button>
        </div>
      </div>
    </div>
  );
}
