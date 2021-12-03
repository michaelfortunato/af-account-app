#!/bin/bash

numberTokens=5

while getopts 'n:v' flag; do
	case "${flag}" in
	n) numberTokens="${OPTARG}" ;;
	esac
done

PARAMS=()
for i in $(seq 0 $numberTokens); do
	rm -f accessToken-$i.key accessToken-$i.key.pub
	echo | ssh-keygen -t rsa -b 4096 -m PEM -f accessToken-$i.key
	openssl rsa -in accessToken-$i.key -pubout -outform PEM -out accessToken-$i.key.pub
	PARAMS+=(--from-file=accessToken-$i.key --from-file=accessToken-$i.key.pub)
done
kubectl delete secret access-tokens --ignore-not-found
kubectl create secret generic access-tokens "${PARAMS[@]}"

PARAMS=()
for i in $(seq 0 $numberTokens); do
	rm -f refreshToken-$i.key refreshToken-$i.key.pub
	echo | ssh-keygen -t rsa -b 4096 -m PEM -f refreshToken-$i.key
	openssl rsa -in refreshToken-$i.key -pubout -outform PEM -out refreshToken-$i.key.pub
	PARAMS+=(--from-file=refreshToken-$i.key --from-file=refreshToken-$i.key.pub)
done
kubectl delete secret refresh-tokens --ignore-not-found
kubectl create secret generic refresh-tokens "${PARAMS[@]}"
