from rest_framework import serializers
from .models import Kamar, Penghuni, Tagihan, Keluhan

class KamarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Kamar
        fields = '__all__'

class PenghuniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Penghuni
        fields = '__all__'
        depth = 1  

class TagihanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tagihan
        fields = '__all__'
        depth = 2

class KeluhanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Keluhan
        fields = '__all__'
        depth = 1