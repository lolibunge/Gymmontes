// Cómo se hace cada ejercicio de las rutinas de GYM MONTES: zona que trabaja, pasos
// y una búsqueda de video en YouTube. Se cargan en el deploy solo donde la dueña
// todavía no escribió nada (no pisa lo que ella cargue en Gym → Máquinas).
// El video es una búsqueda en YouTube hasta que el gimnasio grabe los suyos.

const yt = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

export const EXERCISE_INFO = [
  {
    names: ['Sentadilla en hack', 'Hack squat'],
    muscle: 'Piernas · cuádriceps y glúteos',
    steps: [
      'Apoyá la espalda entera y los hombros en las almohadillas.',
      'Pies al ancho de hombros, en el centro de la plataforma, puntas apenas hacia afuera.',
      'Destrabá la máquina y bajá controlando, con las rodillas en la línea de los pies.',
      'Bajá hasta unos 90° de rodilla o hasta donde no se despegue la cadera.',
      'Subí empujando con todo el pie, sin trabar las rodillas arriba.',
    ],
    video: yt('sentadilla hack máquina técnica'),
  },
  {
    names: ['Extensión de cuádriceps', 'Extensión de cuádriceps uni.', 'Extensión de cuádriceps unilateral', 'Extension de cuadriceps'],
    muscle: 'Piernas · cuádriceps',
    steps: [
      'Ajustá el respaldo para que la rodilla quede alineada con el eje de la máquina.',
      'El rodillo apoya en el empeine, justo arriba del tobillo.',
      'Agarrate de las manijas y estirá la pierna hasta arriba, sin trabar la rodilla.',
      'Sostené un segundo arriba y bajá lento, en 2 o 3 segundos.',
      'Si es unilateral: empezá por la pierna izquierda y hacé las mismas reps con las dos.',
    ],
    video: yt('extensión de cuádriceps máquina técnica'),
  },
  {
    names: ['Step-up bajo con apoyo', 'Step-up', 'Step up'],
    muscle: 'Piernas · cuádriceps y glúteos',
    steps: [
      'Usá un cajón o escalón bajo, firme, y apoyate en algo con una mano.',
      'Apoyá el pie entero arriba del escalón.',
      'Subí empujando con la pierna de arriba, sin impulsarte con la de abajo.',
      'Bajá despacio, controlando, hasta apoyar el otro pie.',
      'Hacé todas las reps de una pierna y después cambiá. Empezá por la izquierda.',
    ],
    video: yt('step up con apoyo técnica'),
  },
  {
    names: ['Femoral prono', 'Femoral prono unilateral', 'Curl femoral acostado'],
    muscle: 'Piernas · isquiotibiales (femorales)',
    steps: [
      'Acostate boca abajo con la rodilla justo pasando el borde del banco.',
      'El rodillo apoya arriba del talón, en el tendón de Aquiles.',
      'Mantené la cadera pegada al banco todo el tiempo.',
      'Flexioná la rodilla llevando el talón hacia la cola, sin levantar la cadera.',
      'Bajá lento, sin dejar caer el peso. Si es unilateral, empezá por la izquierda.',
    ],
    video: yt('curl femoral acostado máquina técnica'),
  },
  {
    names: ['Press de pecho con mancuernas', 'Press plano con mancuernas'],
    muscle: 'Pecho · tríceps y hombro anterior',
    steps: [
      'Acostate en el banco con los pies firmes en el piso y una mancuerna en cada mano.',
      'Llevá los omóplatos atrás y abajo; mantenelos así toda la serie.',
      'Bajá las mancuernas a los costados del pecho, con los codos a unos 45° del cuerpo.',
      'Empujá hacia arriba hasta casi estirar los brazos, sin chocar las mancuernas.',
      'Bajá controlando, en 2 segundos.',
    ],
    video: yt('press de pecho con mancuernas técnica'),
  },
  {
    names: ['Press inclinado con mancuernas'],
    muscle: 'Pecho alto · hombro anterior',
    steps: [
      'Poné el banco inclinado a unos 30°.',
      'Espalda apoyada, omóplatos atrás y abajo, pies firmes en el piso.',
      'Bajá las mancuernas a la altura del pecho alto, codos a unos 45°.',
      'Empujá hacia arriba y un poco hacia adentro, sin trabar los codos.',
      'Bajá lento y controlado.',
    ],
    video: yt('press inclinado con mancuernas técnica'),
  },
  {
    names: ['Remo en polea baja', 'Remo sentado en polea'],
    muscle: 'Espalda · dorsales y romboides',
    steps: [
      'Sentate con los pies en los apoyos y las rodillas apenas flexionadas.',
      'Agarrá el maneral con los brazos estirados y la espalda derecha.',
      'Tirá llevando los codos hacia atrás, pegados al cuerpo, hasta el abdomen.',
      'Juntá los omóplatos un segundo sin echar el torso hacia atrás.',
      'Volvé estirando los brazos despacio, sin perder la postura.',
    ],
    video: yt('remo en polea baja técnica'),
  },
  {
    names: ['Elevación de talones', 'Elevación de talones de pie', 'Gemelos'],
    muscle: 'Piernas · gemelos (pantorrillas)',
    steps: [
      'Apoyá la punta de los pies en el escalón o la plataforma, con los talones en el aire.',
      'Rodillas estiradas pero sin trabar.',
      'Subí en puntas de pie lo más alto que puedas y sostené un segundo.',
      'Bajá lento hasta sentir el estiramiento del gemelo.',
    ],
    video: yt('elevación de talones gemelos técnica'),
  },
  {
    names: ['Jalón al pecho', 'Jalón al pecho agarre neutro', 'Jalón al pecho agarre abierto'],
    muscle: 'Espalda · dorsales y bíceps',
    steps: [
      'Ajustá el apoyo para que las rodillas queden firmes debajo.',
      'Agarrá la barra (o el maneral neutro, palmas enfrentadas) con los brazos estirados.',
      'Pecho arriba y el torso apenas inclinado hacia atrás.',
      'Tirá llevando los codos hacia abajo y atrás, hasta que la barra llegue al pecho alto.',
      'Subí despacio hasta estirar los brazos, sin soltar la tensión.',
    ],
    video: yt('jalón al pecho técnica'),
  },
  {
    names: ['Press de hombros con mancuernas', 'Press militar con mancuernas'],
    muscle: 'Hombros · tríceps',
    steps: [
      'Sentate con el respaldo vertical y la espalda bien apoyada.',
      'Mancuernas a la altura de los hombros, codos un poco adelante del cuerpo.',
      'Empujá hacia arriba hasta casi estirar los brazos.',
      'Bajá controlando hasta la altura de las orejas.',
      'No arquees la zona lumbar: apretá el abdomen.',
    ],
    video: yt('press de hombros con mancuernas sentado técnica'),
  },
  {
    names: ['Elevaciones laterales', 'Elevaciones laterales con mancuernas'],
    muscle: 'Hombros · deltoides lateral',
    steps: [
      'De pie, una mancuerna en cada mano a los costados, codos apenas flexionados.',
      'Subí los brazos hacia los costados hasta la altura de los hombros.',
      'Llevá el movimiento con los codos, no con las manos; sin encoger los hombros.',
      'Bajá lento, en 2 o 3 segundos.',
      'Usá un peso que puedas controlar sin balancear el cuerpo.',
    ],
    video: yt('elevaciones laterales técnica'),
  },
  {
    names: ['Curl de bíceps con mancuernas', 'Curl de biceps'],
    muscle: 'Brazos · bíceps',
    steps: [
      'De pie, mancuernas a los costados con las palmas hacia adelante.',
      'Codos pegados al cuerpo y quietos.',
      'Subí las mancuernas flexionando el codo, sin balancear el torso.',
      'Apretá arriba un segundo y bajá lento hasta estirar el brazo.',
    ],
    video: yt('curl de bíceps con mancuernas técnica'),
  },
  {
    names: ['Curl martillo'],
    muscle: 'Brazos · bíceps y antebrazo',
    steps: [
      'De pie, mancuernas a los costados con las palmas enfrentadas (como agarrando un martillo).',
      'Codos pegados al cuerpo.',
      'Subí flexionando el codo, manteniendo las palmas enfrentadas.',
      'Bajá lento hasta estirar el brazo.',
      'En superserie con tríceps: hacé uno y pasá directo al otro.',
    ],
    video: yt('curl martillo técnica'),
  },
  {
    names: ['Extensión de tríceps con cuerda', 'Extensión de tríceps en polea', 'Tríceps en polea'],
    muscle: 'Brazos · tríceps',
    steps: [
      'Frente a la polea alta, agarrá la cuerda (o la barra) con los codos pegados al cuerpo.',
      'Torso apenas inclinado hacia adelante y abdomen firme.',
      'Estirá los brazos hacia abajo; con cuerda, abrí las puntas al final.',
      'Volvé despacio hasta que los antebrazos queden paralelos al piso.',
      'Los codos no se mueven: solo trabaja el antebrazo.',
    ],
    video: yt('extensión de tríceps con cuerda en polea técnica'),
  },
  {
    names: ['Crunch abdominal con carga', 'Crunch con disco'],
    muscle: 'Abdomen',
    steps: [
      'Acostate boca arriba, rodillas flexionadas y pies apoyados.',
      'Sostené el disco o la mancuerna contra el pecho.',
      'Subí despegando solo los hombros del piso, acercando las costillas a la cadera.',
      'Bajá lento sin apoyar del todo la cabeza.',
      'No tires del cuello; exhalá al subir.',
    ],
    video: yt('crunch abdominal con peso técnica'),
  },
  {
    names: ['Hip thrust', 'Hip thrust con barra'],
    muscle: 'Glúteos · isquiotibiales',
    steps: [
      'Apoyá la parte alta de la espalda en el banco; la barra o el peso sobre la cadera (con almohadilla).',
      'Pies al ancho de cadera, apoyados de modo que arriba la rodilla quede a 90°.',
      'Subí la cadera empujando con los talones hasta alinear rodillas, cadera y hombros.',
      'Apretá los glúteos un segundo arriba, sin arquear la zona lumbar.',
      'Bajá controlando.',
    ],
    video: yt('hip thrust técnica correcta'),
  },
  {
    names: ['Peso muerto rumano con mancuernas', 'Peso muerto rumano'],
    muscle: 'Isquiotibiales · glúteos · espalda baja',
    steps: [
      'Solo si está autorizado y sin dolor.',
      'De pie, mancuernas adelante de los muslos, rodillas apenas flexionadas.',
      'Llevá la cadera hacia atrás y bajá las mancuernas cerca de las piernas, con la espalda recta.',
      'Bajá hasta sentir el estiramiento atrás del muslo (más o menos a mitad de la pierna).',
      'Subí empujando la cadera hacia adelante y apretando los glúteos.',
    ],
    video: yt('peso muerto rumano con mancuernas técnica'),
  },
  {
    names: ['Patada lateral en polea', 'Abducción en polea'],
    muscle: 'Glúteos · glúteo medio',
    steps: [
      'Colocá la tobillera en la polea baja y parate de costado, con la pierna lejana a la máquina enganchada.',
      'Agarrate de la máquina y mantené el torso derecho.',
      'Llevá la pierna hacia el costado, sin girar la punta del pie hacia arriba.',
      'Volvé lento sin que el peso toque abajo.',
      'Hacé todas las reps y cambiá de pierna.',
    ],
    video: yt('patada lateral en polea glúteo medio técnica'),
  },
  {
    names: ['Prensa', 'Prensa de piernas'],
    muscle: 'Piernas · cuádriceps y glúteos',
    steps: [
      'Espalda y cadera bien apoyadas en el respaldo.',
      'Pies al ancho de hombros, en el centro de la plataforma.',
      'Bajá controlado hasta 90° de rodilla, sin despegar la cadera.',
      'Empujá con los talones. No trabes las rodillas arriba.',
    ],
    video: yt('prensa de piernas técnica'),
  },
  {
    names: ['Sentadilla búlgara con apoyo', 'Sentadilla búlgara'],
    muscle: 'Piernas · cuádriceps y glúteos',
    steps: [
      'Solo con buena estabilidad y sin molestias.',
      'Apoyá el empeine de la pierna de atrás en un banco y agarrate de algo con una mano.',
      'El pie de adelante, a un paso largo del banco.',
      'Bajá la rodilla de atrás hacia el piso, con el torso derecho y la rodilla de adelante en línea con el pie.',
      'Subí empujando con el talón de adelante. Empezá por la pierna izquierda.',
    ],
    video: yt('sentadilla búlgara técnica'),
  },
  {
    names: ['Plancha abdominal', 'Plancha'],
    muscle: 'Abdomen · core',
    steps: [
      'Apoyá los antebrazos con los codos debajo de los hombros.',
      'Estirá las piernas y apoyá las puntas de los pies.',
      'Cuerpo en línea recta de la cabeza a los talones: ni la cola arriba ni la cadera caída.',
      'Apretá abdomen y glúteos y respirá normal.',
      'Sostené el tiempo indicado; si se pierde la postura, cortá la serie.',
    ],
    video: yt('plancha abdominal técnica correcta'),
  },
  {
    names: ['Bicicleta', 'Bicicleta fija'],
    muscle: 'Cardio',
    steps: [
      'Ajustá el asiento: con el pedal abajo, la rodilla queda apenas flexionada.',
      'Espalda derecha y manos apoyadas sin cargar peso en los brazos.',
      'Seguí los tramos del timer: suave, moderado o intenso según indique.',
      'Moderado: podés hablar con frases cortas. Intenso: te cuesta hablar.',
    ],
    video: yt('bicicleta fija cómo regular el asiento'),
  },
];
