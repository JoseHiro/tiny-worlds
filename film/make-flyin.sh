#!/bin/sh
# Put the flight from Mini Airport (film/flyin.js, film/out/flyin-<CODE>1) in front of a world's film (film/out/<name>1),
# the two meeting in white, with sound: a jet passing over for the flight, then the world's own sound (snow: wind and
# twinkles, as film/make-snow.sh).
# film/make-flyin.sh CTS snowfest  →  film/out/snowfest-fly.mp4 (and snowfest-fly-silent.mp4)
set -e
code=$1; name=$2; out="$name-fly"
cd "$(dirname "$0")/out"
ffmpeg -y -loglevel error -framerate 30 -i "flyin-${code}1/%05d.jpg" -framerate 30 -i "${name}1/%05d.jpg" \
  -filter_complex "[0][1]concat=n=2:v=1[v]" -map "[v]" -c:v libx264 -pix_fmt yuv420p -crf 18 "$out-silent.mp4"
T=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out-silent.mp4")
F=$(ls "flyin-${code}1" | wc -l | tr -d ' '); A=$(echo "$F / 30" | bc -l) # (where the world begins)
ffmpeg -y -loglevel error -i "$out-silent.mp4" \
  -f lavfi -i "anoisesrc=color=pink:amplitude=0.6:duration=$A:sample_rate=48000" \
  -f lavfi -i "anoisesrc=color=pink:amplitude=0.5:duration=$T:sample_rate=48000" \
  -f lavfi -i "anoisesrc=color=brown:amplitude=0.4:duration=$T:sample_rate=48000" \
  -f lavfi -i "aevalsrc='0.05*sin(2*PI*1568*t)*exp(-5*mod(t,2.9))+0.04*sin(2*PI*2093*t)*exp(-5*mod(t+1.2,3.7))+0.035*sin(2*PI*2637*t)*exp(-6*mod(t+2.1,4.3))+0.03*sin(2*PI*1760*t)*exp(-5*mod(t+0.6,5.3))':s=48000:d=$T" \
  -filter_complex "[1]lowpass=f=900,highpass=f=120,volume='0.5+1.6*pow(sin(PI*min(t/$A,1)),2)':eval=frame,afade=t=in:d=0.15,afade=t=out:st=$(echo "$A - 0.5" | bc -l):d=0.6[jet];\
[2]bandpass=f=500:width_type=o:w=2,volume='0.25+0.6*pow(0.5+0.5*sin(2*PI*t/7.3),2)+0.2*pow(0.5+0.5*sin(2*PI*t/3.1+1),3)':eval=frame[wind];[3]lowpass=f=220,volume='0.4+0.3*sin(2*PI*t/9.1)':eval=frame[low];[4]aecho=0.8:0.6:120|260:0.35|0.2,volume=0.9[tw];\
[wind][low][tw]amix=inputs=3:weights=1 0.6 0.8,volume=1.7,afade=t=in:st=$(echo "$A - 0.4" | bc -l):d=1.0,afade=t=out:st=$(echo "$T - 1.2" | bc -l):d=1.2[snow];\
[jet][snow]amix=inputs=2:duration=longest:normalize=0[au]" \
  -map 0:v -map "[au]" -c:v copy -c:a aac -b:a 160k -movflags +faststart "$out.mp4"
echo "film/out/$out.mp4  ($T s)"
