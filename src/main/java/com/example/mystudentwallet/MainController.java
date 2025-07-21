package com.example.mystudentwallet;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.fxml.Initializable;
import javafx.scene.Node;
import javafx.scene.control.Button;
import javafx.scene.layout.AnchorPane;
import javafx.scene.layout.VBox;
import java.io.IOException;
import java.net.URL;
import java.util.ResourceBundle;

public class MainController implements Initializable {
   @FXML
   Button btnDashboard,btnCharts,btnTransactions,btnAdd;
   @FXML
   private AnchorPane contentArea;

   @Override
   public void initialize(URL location, ResourceBundle resources) {
      loadDashboard();
      setupButtonEvents();
      setActiveButton(btnDashboard);
   }

   private void setupButtonEvents(){
      btnDashboard.setOnAction(e->{
         loadDashboard();
         setActiveButton(btnDashboard);
      });
      btnAdd.setOnAction(e->{
         loadAddTrans();
         setActiveButton(btnAdd);
      });
      btnTransactions.setOnAction(e->{
         loadTransList();
         setActiveButton(btnTransactions);
      });
      btnCharts.setOnAction(e->{
         loadGraph();
         setActiveButton(btnCharts);
      });
   }
   private void loadDashboard(){
      try{
         FXMLLoader loader = new FXMLLoader(getClass().getResource("/com/example/mystudentwallet/interfaceGraph/Dashboard.fxml"));
         Node inter = loader.load();
         DashboardController dashboardController = loader.getController();
         dashboardController.setMainController(this);
         setContentArea(inter);
      }
      catch (IOException e) {
         throw new RuntimeException(e);
      }
   }
   private void loadAddTrans(){
      try{
      FXMLLoader loader = new FXMLLoader(getClass().getResource("/com/example/mystudentwallet/interfaceGraph/Add-transaction.fxml"));
      Node inter = loader.load();
      AddTransController addTransController = loader.getController();
      addTransController.setMainController(this);
      setContentArea(inter);
      }
      catch (IOException e){
         throw new RuntimeException(e);
      }
   }
   private void loadTransList(){
      Node inter = loadFile("/com/example/mystudentwallet/interfaceGraph/Transactions-List.fxml");
      setContentArea(inter);
   }
   private void loadGraph(){
      Node inter = loadFile("/com/example/mystudentwallet/interfaceGraph/ghaphique.fxml");
      setContentArea(inter);
   }
   public void navigateToAddTransaction() {
      loadAddTrans();
      setActiveButton(btnAdd);
   }
   public void navigateToDashboard(){
      loadDashboard();
      setActiveButton(btnDashboard);
   }
   private Node loadFile(String path){
      try {
         FXMLLoader loader = new FXMLLoader(getClass().getResource(path));
         return loader.load();
      }
      catch (IOException e) {
         System.err.println("Erreur lors du chargement de " + path + ": " + e.getMessage());
         e.printStackTrace();
         return null;
      }
   }
   private void setContentArea(Node component){
      contentArea.getChildren().clear();
      if(component != null)
         contentArea.getChildren().add(component);
   }
   public void setActiveButton(Button btn){
      btnDashboard.getStyleClass().remove("nav-button-active");
      btnAdd.getStyleClass().remove("nav-button-active");
      btnCharts.getStyleClass().remove("nav-button-active");
      btnTransactions.getStyleClass().remove("nav-button-active");
      btn.getStyleClass().add("nav-button-active");
   }
}