import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot } from 'firebase/firestore';

/**
 * Iron-Core: Arquitetura Backend e Lógica de Treino
 * Responsável por progressão de carga, logs e segurança.
 */
export const ironCore = {
  // Salvar log de treino
  async saveTrainingLog(workoutData: any) {
    if (!auth.currentUser) throw new Error('Usuário não autenticado');
    
    return addDoc(collection(db, 'training_logs'), {
      userId: auth.currentUser.uid,
      ...workoutData,
      timestamp: serverTimestamp(),
    });
  },

  // Monitorar logs em tempo real (Real-time listener solicitado)
  subscribeToLogs(callback: (logs: any[]) => void) {
    if (!auth.currentUser) return () => {};

    const q = query(
      collection(db, 'training_logs'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, 
      (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(logs);
      },
      (err) => {
        console.warn("Real-time training logs listener suspended:", err);
      }
    );
  },

  // Lógica de Progressão de Carga (IA baseada em volume/intensidade)
  calculateNextLoad(currentLoad: number, reps: number, rpe: number): number {
    // Implementação básica de sobrecarga progressiva
    if (rpe < 7) return currentLoad * 1.05; // Aumenta 5% se estiver fácil
    if (rpe > 9) return currentLoad; // Mantém se estiver no limite
    return currentLoad * 1.02; // Aumento incremental padrão
  }
};
