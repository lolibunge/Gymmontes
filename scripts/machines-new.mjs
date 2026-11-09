// v1.23: máquinas que no tenían QR (fotos del 9/11/2026). Cada una lleva sus ejercicios con
// zona, pasos y un video. Los videos abren una búsqueda en YouTube hasta que la entrenadora
// cargue los suyos en Gym → Máquinas (no se pisan los que ella cargue).

const yt = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q).replace(/%20/g, '+')}`;
const X = (slug, name, muscle, steps, search) => ({ slug, names: [name], muscle, steps, video: yt(search) });

export const NEW_MACHINES = [
  {
    key: 'scott',
    name: 'Banco Scott',
    exercises: [
      X('curl-scott-barra', 'Curl en banco Scott con barra', 'Brazos · bíceps', [
        'Sentate con las axilas bien apoyadas arriba del almohadón y la parte de atrás de los brazos sobre él.',
        'Agarrá la barra (mejor la Z) con las palmas hacia arriba, al ancho de los hombros.',
        'Subí la barra doblando los codos, sin despegar los brazos del almohadón.',
        'Bajá lento, en 2 o 3 segundos, hasta casi estirar el brazo sin trabar el codo.',
      ], 'curl predicador con barra z tecnica short'),
      X('curl-scott-mancuerna', 'Curl en banco Scott con mancuerna', 'Brazos · bíceps', [
        'Apoyá un brazo sobre el almohadón, con la axila arriba del borde.',
        'Mancuerna en la mano, palma hacia arriba; la otra mano sostiene el almohadón.',
        'Subí la mancuerna doblando el codo, sin girar el hombro.',
        'Bajá lento hasta casi estirar el brazo. Hacé las mismas reps con los dos brazos.',
      ], 'curl predicador unilateral con mancuerna short'),
      X('curl-martillo-scott', 'Curl martillo en banco Scott', 'Brazos · antebrazos y bíceps', [
        'Apoyá el brazo sobre el almohadón, con la mancuerna en la mano y el pulgar hacia arriba.',
        'Subí la mancuerna sin girar la muñeca, como si clavaras un martillo.',
        'El brazo no se despega del almohadón.',
        'Bajá lento, en 2 o 3 segundos.',
      ], 'curl martillo en banco scott short'),
      X('curl-invertido-scott', 'Curl invertido en banco Scott', 'Brazos · antebrazos y bíceps', [
        'Apoyá los brazos en el almohadón y agarrá la barra con las palmas hacia abajo.',
        'Muñecas firmes, en línea con el antebrazo.',
        'Subí la barra doblando los codos, sin balancear el cuerpo.',
        'Bajá lento. Usá menos peso que en el curl normal.',
      ], 'curl invertido en banco scott short'),
      X('triceps-scott', 'Extensión de tríceps en banco Scott', 'Brazos · tríceps', [
        'Parate o sentate del otro lado del banco, con el brazo apoyado y el codo arriba del almohadón.',
        'Mancuerna en la mano, el codo doblado y la mano cerca del hombro.',
        'Estirá el brazo empujando la mancuerna hacia abajo, sin mover el codo.',
        'Volvé lento hasta doblar el codo de nuevo.',
      ], 'extension de triceps en banco scott short'),
    ],
  },
  {
    key: 'smith',
    name: 'Máquina Smith',
    exercises: [
      X('sentadilla-smith', 'Sentadilla en Smith', 'Piernas · cuádriceps y glúteos', [
        'Colocá la barra sobre la parte alta de la espalda (no sobre el cuello), con el almohadón.',
        'Pies al ancho de los hombros, un poco adelante de la barra.',
        'Girá la barra para destrabarla y bajá llevando la cadera atrás, con el pecho alto.',
        'Bajá hasta unos 90° de rodilla y subí empujando con todo el pie.',
        'Al terminar, girá la barra para dejarla trabada en un gancho.',
      ], 'sentadilla en maquina smith tecnica short'),
      X('bulgara-smith', 'Sentadilla búlgara en Smith', 'Piernas · glúteos y cuádriceps', [
        'Barra sobre la espalda y el empeine de atrás apoyado en un banco.',
        'El pie de adelante bien adelantado, para que la rodilla no pase la punta del pie.',
        'Bajá derecho hacia abajo hasta que la rodilla de atrás quede cerca del piso.',
        'Subí empujando con el talón de adelante. Hacé las mismas reps con las dos piernas.',
      ], 'sentadilla bulgara en smith short'),
      X('hip-thrust-smith', 'Hip thrust en Smith', 'Glúteos · isquiotibiales', [
        'Sentate en el piso con la espalda alta apoyada en un banco y la barra (con almohadón) sobre la cadera.',
        'Pies apoyados al ancho de la cadera, rodillas dobladas.',
        'Destrabá la barra y subí la cadera apretando los glúteos hasta quedar en línea recta de rodillas a hombros.',
        'Sostené un segundo arriba y bajá controlado.',
      ], 'hip thrust en smith short'),
      X('peso-muerto-rumano-smith', 'Peso muerto rumano en Smith', 'Piernas · isquiotibiales y glúteos', [
        'De pie, la barra frente a los muslos, agarrada al ancho de los hombros.',
        'Rodillas apenas flexionadas y espalda recta.',
        'Llevá la cadera hacia atrás y bajá la barra pegada a las piernas hasta media pierna.',
        'Subí apretando los glúteos, sin echar el cuerpo hacia atrás.',
      ], 'peso muerto rumano en smith short'),
      X('press-banca-smith', 'Press de banca en Smith', 'Pecho · hombros y tríceps', [
        'Acostate en el banco con la barra a la altura de la mitad del pecho.',
        'Agarrá la barra un poco más abierto que los hombros y destrabala.',
        'Bajá lento hasta rozar el pecho, con los codos un poco cerrados.',
        'Empujá hacia arriba sin trabar los codos.',
      ], 'press de banca en smith short'),
      X('press-inclinado-smith', 'Press inclinado en Smith', 'Pecho · hombros y tríceps', [
        'Banco inclinado (30 a 45°) debajo de la barra, que baje a la parte alta del pecho.',
        'Agarrá la barra un poco más abierto que los hombros y destrabala.',
        'Bajá lento hasta rozar el pecho y empujá hacia arriba.',
        'Mantené los omóplatos apretados contra el banco.',
      ], 'press inclinado en smith short'),
      X('press-militar-smith', 'Press militar en Smith', 'Hombros · tríceps', [
        'Banco con respaldo recto debajo de la barra; la barra baja frente a la cara.',
        'Agarrá la barra un poco más abierto que los hombros.',
        'Destrabá y bajá hasta la altura del mentón.',
        'Empujá hacia arriba sin arquear la espalda baja.',
      ], 'press militar en smith sentado short'),
      X('remo-smith', 'Remo en Smith', 'Espalda · dorsales y bíceps', [
        'Barra a la altura de las rodillas. Agarrala un poco más abierto que los hombros.',
        'Inclinate hacia adelante con la espalda recta y las rodillas apenas flexionadas.',
        'Llevá la barra hacia el ombligo juntando los omóplatos.',
        'Bajá controlado, sin redondear la espalda.',
      ], 'remo en maquina smith short'),
      X('talones-smith', 'Elevación de talones en Smith', 'Piernas · gemelos', [
        'Barra sobre la espalda y las puntas de los pies sobre un disco o escalón.',
        'Destrabá la barra y dejá bajar los talones hasta sentir que estira la pantorrilla.',
        'Subí en puntas de pie lo más alto que puedas.',
        'Sostené un segundo arriba y bajá lento.',
      ], 'elevacion de talones en smith short'),
    ],
  },
  {
    key: 'soportes',
    name: 'Soportes de sentadilla con barra',
    exercises: [
      X('sentadilla-barra', 'Sentadilla con barra', 'Piernas · cuádriceps y glúteos · core', [
        'Poné los soportes a la altura del pecho. Metete debajo de la barra y apoyala sobre la parte alta de la espalda.',
        'Sacala del soporte con un paso atrás; pies al ancho de los hombros, puntas apenas afuera.',
        'Bajá llevando la cadera atrás y abajo, con el pecho alto y las rodillas en la línea de los pies.',
        'Subí empujando con todo el pie. Al terminar, caminá hasta el soporte y apoyá la barra.',
      ], 'sentadilla con barra tecnica short'),
      X('sentadilla-frontal-barra', 'Sentadilla frontal con barra', 'Piernas · cuádriceps · core', [
        'La barra va adelante, apoyada sobre los hombros, con los codos altos.',
        'Pies al ancho de los hombros.',
        'Bajá derecho, con el torso lo más vertical posible.',
        'Subí empujando con todo el pie, sin dejar caer los codos.',
      ], 'sentadilla frontal con barra short'),
      X('press-banca-barra', 'Press de banca con barra', 'Pecho · hombros y tríceps', [
        'Poné el banco plano entre los soportes y la barra a la altura de los brazos estirados.',
        'Ojos debajo de la barra, pies firmes en el piso, omóplatos apretados.',
        'Sacá la barra y bajala lento hasta la mitad del pecho.',
        'Empujá hacia arriba. Si es pesado, pedí que alguien te asista.',
      ], 'press de banca con barra tecnica short'),
      X('press-militar-barra', 'Press militar de pie con barra', 'Hombros · tríceps · core', [
        'Sacá la barra del soporte a la altura de los hombros, agarrada un poco más abierto que los hombros.',
        'Abdomen y glúteos firmes, sin arquear la espalda.',
        'Empujá la barra hacia arriba, pasando cerca de la cara.',
        'Bajá controlado hasta la altura del mentón.',
      ], 'press militar de pie con barra short'),
      X('zancadas-barra', 'Zancadas con barra', 'Piernas · glúteos y cuádriceps', [
        'Barra sobre la parte alta de la espalda, de pie y con el abdomen firme.',
        'Dá un paso largo adelante y bajá hasta que las dos rodillas queden cerca de 90°.',
        'El torso queda derecho y la rodilla de adelante no pasa la punta del pie.',
        'Volvé empujando con el talón de adelante y alterná las piernas.',
      ], 'zancadas con barra short'),
      X('buenos-dias-barra', 'Buenos días con barra', 'Piernas · isquiotibiales · espalda baja', [
        'Barra liviana sobre la parte alta de la espalda, pies al ancho de la cadera.',
        'Rodillas apenas flexionadas y espalda recta.',
        'Inclinate llevando la cadera hacia atrás hasta que el torso quede casi paralelo al piso.',
        'Volvé a subir apretando los glúteos.',
      ], 'buenos dias con barra short'),
    ],
  },
  {
    key: 'banco-best',
    name: 'Banco con soportes y Scott',
    exercises: [
      X('curl-scott-banco-best', 'Curl en Scott del banco con soportes', 'Brazos · bíceps', [
        'Ajustá el asiento para que las axilas queden apoyadas arriba del almohadón.',
        'Agarrá la barra con las palmas hacia arriba, al ancho de los hombros.',
        'Subí doblando los codos, sin despegar los brazos del almohadón.',
        'Bajá lento hasta casi estirar el brazo.',
      ], 'curl predicador con barra short'),
      X('press-banca-banco-best', 'Press de banca en banco con soportes', 'Pecho · hombros y tríceps', [
        'Acostate con los ojos debajo de la barra, pies firmes en el piso.',
        'Agarrá la barra un poco más abierto que los hombros y sacala del soporte.',
        'Bajala lento hasta la mitad del pecho y empujá hacia arriba.',
        'Volvé a apoyar la barra en los soportes con los brazos estirados.',
      ], 'press de banca con barra short'),
    ],
  },
  {
    key: 'press-pecho-zeus',
    name: 'Press de pecho sentado (ZEUS)',
    exercises: [
      X('press-pecho-sentado-zeus', 'Press de pecho sentado en máquina', 'Pecho · hombros y tríceps', [
        'Cargá el mismo peso en los dos lados.',
        'Ajustá el asiento para que las manijas queden a la altura de la mitad del pecho.',
        'Espalda apoyada en el respaldo; empujá las manijas hacia adelante sin trabar los codos.',
        'Volvé lento hasta sentir que estira el pecho.',
      ], 'press de pecho sentado maquina de discos short'),
      X('press-pecho-sentado-un-brazo', 'Press de pecho sentado a un brazo', 'Pecho · hombros y tríceps · core', [
        'Mismo armado que el press de pecho, pero empujás con un brazo por vez.',
        'Mantené la espalda apoyada y el torso quieto, sin girar.',
        'Empujá hacia adelante y volvé lento.',
        'Hacé las mismas reps con los dos brazos.',
      ], 'press de pecho unilateral maquina short'),
    ],
  },
  {
    key: 'barras-fijas',
    name: 'Rack de barras fijas',
    exercises: [
      X('curl-barra-fija', 'Curl de bíceps con barra fija', 'Brazos · bíceps', [
        'De pie, la barra agarrada con las palmas hacia arriba al ancho de los hombros.',
        'Codos pegados al cuerpo.',
        'Subí la barra doblando los codos, sin balancear el cuerpo.',
        'Bajá lento hasta estirar los brazos.',
      ], 'curl de biceps con barra short'),
      X('remo-barra-fija', 'Remo con barra fija', 'Espalda · dorsales y bíceps', [
        'Agarrá la barra con las palmas hacia abajo y las rodillas apenas flexionadas.',
        'Inclinate hacia adelante con la espalda recta.',
        'Llevá la barra hacia el ombligo juntando los omóplatos.',
        'Bajá controlado, sin redondear la espalda.',
      ], 'remo con barra inclinado short'),
      X('press-militar-barra-fija', 'Press militar con barra fija', 'Hombros · tríceps', [
        'De pie o sentado, la barra a la altura de los hombros.',
        'Abdomen firme, sin arquear la espalda.',
        'Empujá la barra hacia arriba hasta estirar los brazos.',
        'Bajá controlado hasta el mentón.',
      ], 'press militar con barra short'),
      X('peso-muerto-rumano-barra-fija', 'Peso muerto rumano con barra fija', 'Piernas · isquiotibiales y glúteos', [
        'De pie, la barra frente a los muslos, rodillas apenas flexionadas.',
        'Llevá la cadera hacia atrás y bajá la barra pegada a las piernas, con la espalda recta.',
        'Bajá hasta media pierna, donde sientas que estira atrás del muslo.',
        'Subí apretando los glúteos.',
      ], 'peso muerto rumano con barra short'),
      X('hip-thrust-barra-fija', 'Hip thrust con barra fija', 'Glúteos · isquiotibiales', [
        'Usá la barra con almohadón. Espalda alta apoyada en un banco y la barra sobre la cadera.',
        'Pies apoyados al ancho de la cadera.',
        'Subí la cadera apretando los glúteos hasta quedar en línea recta.',
        'Sostené un segundo arriba y bajá controlado.',
      ], 'hip thrust con barra short'),
      X('zancadas-barra-fija', 'Zancadas con barra fija', 'Piernas · glúteos y cuádriceps', [
        'Barra sobre la parte alta de la espalda, abdomen firme.',
        'Dá un paso largo adelante y bajá hasta que las rodillas queden cerca de 90°.',
        'Volvé empujando con el talón de adelante.',
        'Alterná las piernas.',
      ], 'zancadas con barra short'),
      X('press-frances-barra-fija', 'Press francés con barra fija', 'Brazos · tríceps', [
        'Acostate en un banco con la barra arriba del pecho, brazos estirados.',
        'Doblá solo los codos y bajá la barra hacia la frente.',
        'Los codos quedan quietos y apuntando al techo.',
        'Estirá los brazos para volver arriba.',
      ], 'press frances con barra short'),
      X('encogimientos-barra-fija', 'Encogimientos de hombros con barra fija', 'Trapecio · hombros', [
        'De pie, la barra frente a los muslos con los brazos estirados.',
        'Subí los hombros hacia las orejas, sin doblar los codos.',
        'Sostené un segundo arriba.',
        'Bajá lento.',
      ], 'encogimientos de hombros con barra short'),
    ],
  },
  {
    key: 'torre',
    name: 'Torre de dominadas y fondos',
    exercises: [
      X('dominadas-torre', 'Dominadas', 'Espalda · dorsales y bíceps', [
        'Colgate de la barra de arriba con las palmas hacia adelante, un poco más abierto que los hombros.',
        'Bajá los hombros (lejos de las orejas) antes de subir.',
        'Subí hasta que el mentón pase la barra, sin balancearte.',
        'Bajá lento hasta estirar los brazos. Si cuesta, usá una banda elástica de ayuda.',
      ], 'dominadas tecnica principiantes short'),
      X('dominadas-neutras-torre', 'Dominadas con agarre neutro', 'Espalda · dorsales y bíceps', [
        'Agarrá las manijas paralelas de arriba, con las palmas enfrentadas.',
        'Bajá los hombros antes de subir.',
        'Subí hasta que el mentón pase las manijas.',
        'Bajá lento hasta estirar los brazos.',
      ], 'dominadas agarre neutro short'),
      X('fondos-paralelas', 'Fondos en paralelas', 'Brazos · tríceps · pecho y hombros', [
        'Apoyá las manos en las paralelas y subí con los brazos estirados.',
        'Bajá doblando los codos hasta unos 90°, con el torso apenas inclinado.',
        'Empujá hacia arriba hasta estirar los brazos.',
        'Si cuesta, apoyá los pies en el cajón o hacé solo la bajada lenta.',
      ], 'fondos en paralelas tecnica short'),
      X('elevacion-rodillas-silla', 'Elevación de rodillas en silla romana', 'Abdomen · abdominales', [
        'Apoyá los antebrazos en los apoyabrazos y la espalda en el respaldo; agarrate de las manijas.',
        'Dejá las piernas colgando.',
        'Subí las rodillas hacia el pecho sin balancearte.',
        'Bajá lento. Para hacerlo más difícil, subí las piernas estiradas.',
      ], 'elevacion de rodillas silla romana short'),
      X('colgarse-barra', 'Colgarse de la barra', 'Brazos · antebrazos · hombros', [
        'Agarrá la barra de arriba con las palmas hacia adelante.',
        'Quedate colgado con los brazos estirados y el abdomen firme.',
        'Respirá tranquilo y sostené el tiempo que indique la rutina.',
        'Soltá apoyando primero los pies en el cajón.',
      ], 'dead hang colgarse barra short'),
    ],
  },
];
