gcloud run deploy smart-route-optimizer \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --port 8080 \
  --project myprojectsangu \
  --set-env-vars "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDSXUWiWvQdnzBXLX_uwizByviEvQXviwo,NEXT_PUBLIC_GOOGLE_PLACES_KEY=AIzaSyBNsE3fMGbQhrBVLbs0dRNhSutTjIKngy4,GOOGLE_DIRECTIONS_KEY=AIzaSyA0btnvC_Wct8GmBDqAhnwOCyj0YFgWZqU"
