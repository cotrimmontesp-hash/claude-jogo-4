#!/bin/bash
# Teste do APK no emulador: abre o jogo, toca nos botões e tira fotos.
mkdir -p shots
adb install -r TitaCoral.apk
adb logcat -c
adb shell settings put secure immersive_mode_confirmations confirmed
adb shell monkey -p com.claude.titacoral -c android.intent.category.LAUNCHER 1
sleep 35
n=0
shot(){ n=$((n+1)); adb exec-out screencap -p > "shots/$(printf %02d $n)-$1.png"; }
# toca no texto $1; se não achar, usa a posição $2,$3 (em pixels)
tap(){
  adb shell uiautomator dump /sdcard/u.xml >> shots/dump.txt 2>&1; adb pull /sdcard/u.xml u.xml >/dev/null 2>&1
  B=$(grep -o "text=\"$1\"[^>]*bounds=\"\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]\"" u.xml 2>/dev/null | head -1 | grep -o '[0-9][0-9]*' | tail -4 | tr '\n' ' ')
  if [ -n "$B" ]; then set -- $B; adb shell input tap $(( ($1+$3)/2 )) $(( ($2+$4)/2 )); echo "achei: $1" >> shots/toques.txt
  else adb shell input tap $2 $3; echo "posição: $1 $2 $3" >> shots/toques.txt; fi
  rm -f u.xml
}
back(){ adb shell input keyevent 4; sleep 2; }
shot inicio
tap "Jogar" 1764 201; sleep 4; shot dialogo
tap "Pular" 2210 70; sleep 3; shot jogo
adb shell input swipe 420 760 700 640 2500; shot andando
adb shell input tap 2070 840; sleep 1; shot tiro
back; shot pausa
tap "Sair" 1460 761; sleep 3; shot menu
tap "Personagens" 1600 699; sleep 3; shot personagens
back
tap "Armas" 1925 699; sleep 3; shot armas
back
tap "Personalizar" 1764 848; sleep 3; shot personalizar
back
tap "Online" 1600 550; sleep 3; shot online
back
tap "Amigos" 1925 550; sleep 6; shot amigos
back
tap "Modo Ondas" 1764 399; sleep 12; shot ondas
adb logcat -d > shots/logcat.txt
true
