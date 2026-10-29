#!/bin/sh
# Join the three filmed pieces of "Mina's rainy day" (film/out/mina1…3, from film/mina.js) into one vertical video:
# a half-second cross-fade between the cafés, and a soft rain under it that follows the story (drizzle up north
# stopping, the downpour in the old town, quiet in Barcelona). Writes film/out/mina.mp4 (and mina-silent.mp4).
set -e
cd "$(dirname "$0")/out"
F=0.5
for n in 1 2 3; do ffmpeg -y -loglevel error -framerate 30 -i "mina$n/%05d.jpg" -c:v libx264 -pix_fmt yuv420p -crf 18 "seg$n.mp4"; done
len() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }
L1=$(len seg1.mp4); L2=$(len seg2.mp4); L3=$(len seg3.mp4)
O1=$(echo "$L1 - $F" | bc); O2=$(echo "$O1 + $L2 - $F" | bc); T=$(echo "$O2 + $L3" | bc)
# the rain's loudness over time: chapter 1 drizzle, fading as the sky clears (its last shot starts at 7.2 s);
# chapter 2 a downpour (outside), softer indoors (+3.2 s), drizzle again (+6.8 s); chapter 3 almost nothing
R="if(lt(t,7.2),0.35,if(lt(t,$O1),0.35-0.3*(t-7.2)/($O1-7.2),if(lt(t,$O1+0.4),0.05+2*(t-$O1),if(lt(t,$O1+3.2),0.85,if(lt(t,$O1+6.8),0.45,if(lt(t,$O2),0.3,max(0.02,0.3-0.3*(t-$O2)/0.8)))))))"
ffmpeg -y -loglevel error -i seg1.mp4 -i seg2.mp4 -i seg3.mp4 \
  -f lavfi -i "anoisesrc=color=pink:amplitude=0.6:duration=$T:sample_rate=48000" \
  -f lavfi -i "anoisesrc=color=brown:amplitude=0.5:duration=$T:sample_rate=48000" \
  -filter_complex "[0][1]xfade=transition=fade:duration=$F:offset=$O1[a];[a][2]xfade=transition=fade:duration=$F:offset=$O2[v];\
[3]highpass=f=400,lowpass=f=5200[p];[4]lowpass=f=420[b];[p][b]amix=inputs=2:weights=1 0.6,volume='$R':eval=frame,volume=3,afade=t=in:d=0.6,afade=t=out:st=$(echo "$T - 1" | bc):d=1[au]" \
  -map "[v]" -map "[au]" -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 160k -movflags +faststart mina.mp4
ffmpeg -y -loglevel error -i mina.mp4 -an -c:v copy mina-silent.mp4
echo "film/out/mina.mp4  ($T s)"
