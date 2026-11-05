#!/bin/bash
# Teste do APK no emulador: abre o jogo, toca nos botões pelo texto e tira fotos.
mkdir -p shots
adb install -r TitaCoral.apk
adb logcat -c
adb shell monkey -p com.claude.titacoral -c android.intent.category.LAUNCHER 1
sleep 35
n=0
shot(){ n=$((n+1)); adb exec-out screencap -p > "shots/$(printf %02d $n)-$1.png"; }
tap(){ # toca no centro do primeiro texto igual a $1
  adb shell uiautomator dump /sdcard/u.xml >/dev/null 2>&1; adb pull /sdcard/u.xml u.xml >/dev/null 2>&1
  B=$(grep -o "text=\"$1\"[^>]*bounds=\"\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]\"" u.xml | head -1 | grep -o '[0-9][0-9]*' | tail -4 | tr '\n' ' ')
  if [ -z "$B" ]; then echo "não achei: $1" >> shots/falhas.txt; return; fi
  set -- $B; adb shell input tap $(( ($1+$3)/2 )) $(( ($2+$4)/2 ))
}
S=$(adb shell wm size | grep -o '[0-9]*x[0-9]*' | tail -1); A=${S%x*}; B=${S#*x}
if [ $A -gt $B ]; then WW=$A; HH=$B; else WW=$B; HH=$A; fi
echo "$WW x $HH" > shots/size.txt
shot inicio
tap "Jogar"; sleep 3; shot dialogo
tap "Pular"; sleep 3; shot jogo
adb shell input swipe $((WW*18/100)) $((HH*70/100)) $((WW*28/100)) $((HH*62/100)) 2500; shot andando
adb shell input tap $((WW-96*WW/800)) $((HH-92*HH/400)); sleep 1; shot tiro
tap "II"; sleep 2; shot pausa
tap "Sair"; sleep 3
tap "Personagens"; sleep 3; shot personagens
tap "Voltar"; sleep 2
tap "Armas"; sleep 3; shot armas
tap "Voltar"; sleep 2
tap "Personalizar"; sleep 3; shot personalizar
tap "Pronto"; sleep 2
tap "Online"; sleep 3; shot online
tap "Voltar"; sleep 2
tap "Amigos"; sleep 6; shot amigos
tap "Voltar"; sleep 2
tap "Modo Ondas"; sleep 12; shot ondas
adb logcat -d > shots/logcat.txt
true
