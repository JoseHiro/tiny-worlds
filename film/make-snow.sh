#!/bin/sh
# Join one filmed piece (film/out/<name>1) into a vertical video with a winter sound under it: a soft wind rising and
# falling, and now and then a high glassy twinkle (like the snow catching the sun).
# film/make-snow.sh snowfest  →  film/out/snowfest.mp4 (and snowfest-silent.mp4)
set -e
name=$1
cd "$(dirname "$0")/out"
ffmpeg -y -loglevel error -framerate 30 -i "${name}1/%05d.jpg" -c:v libx264 -pix_fmt yuv420p -crf 18 "$name-silent.mp4"
T=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$name-silent.mp4")
ffmpeg -y -loglevel error -i "$name-silent.mp4" \
  -f lavfi -i "anoisesrc=color=pink:amplitude=0.5:duration=$T:sample_rate=48000" \
  -f lavfi -i "anoisesrc=color=brown:amplitude=0.4:duration=$T:sample_rate=48000" \
  -f lavfi -i "aevalsrc='0.05*sin(2*PI*1568*t)*exp(-5*mod(t,2.9))+0.04*sin(2*PI*2093*t)*exp(-5*mod(t+1.2,3.7))+0.035*sin(2*PI*2637*t)*exp(-6*mod(t+2.1,4.3))+0.03*sin(2*PI*1760*t)*exp(-5*mod(t+0.6,5.3))':s=48000:d=$T" \
  -filter_complex "[1]bandpass=f=500:width_type=o:w=2,volume='0.25+0.6*pow(0.5+0.5*sin(2*PI*t/7.3),2)+0.2*pow(0.5+0.5*sin(2*PI*t/3.1+1),3)':eval=frame[wind];[2]lowpass=f=220,volume='0.4+0.3*sin(2*PI*t/9.1)':eval=frame[low];[3]aecho=0.8:0.6:120|260:0.35|0.2,volume=0.9[tw];[wind][low][tw]amix=inputs=3:weights=1 0.6 0.8,volume=1.7,afade=t=in:d=0.8,afade=t=out:st=$(echo "$T - 1.2" | bc):d=1.2[au]" \
  -map 0:v -map "[au]" -c:v copy -c:a aac -b:a 160k -movflags +faststart "$name.mp4"
echo "film/out/$name.mp4  ($T s)"
